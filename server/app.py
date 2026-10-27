"""小满花园本地账号服务：Flask + SQLite。

运行：
    python -m server.app
"""

from __future__ import annotations

import hmac
import json
import os
import re
import secrets
import sqlite3
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import (
    Flask,
    flash,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

from server.db import connect_db, init_db, utc_now

ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = ROOT / "www"
DEFAULT_DATA_DIR = ROOT / "server" / "data"
USERNAME_RE = re.compile(r"^[A-Za-z0-9_\u4e00-\u9fff]{3,20}$")
SAVE_KEY = "xiaoman-garden-save-v1"
CSRF_HEADER = "X-CSRF-Token"
MAX_SAVE_BYTES = 512 * 1024
INDEX_PLACEHOLDER = "<!-- ACCOUNT_BOOTSTRAP -->"


def _load_or_create_secret(data_dir: Path) -> str:
    secret_path = data_dir / "secret_key"
    if secret_path.exists():
        value = secret_path.read_text(encoding="utf-8").strip()
        if value:
            return value
    value = secrets.token_hex(32)
    secret_path.write_text(value, encoding="utf-8")
    return value


def create_app(test_config: dict | None = None) -> Flask:
    test_config = dict(test_config or {})
    data_dir = Path(
        test_config.get("DATA_DIR")
        or os.environ.get("GARDEN_DATA_DIR")
        or DEFAULT_DATA_DIR
    )
    data_dir.mkdir(parents=True, exist_ok=True)

    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
        static_url_path="/auth-static",
    )
    app.json.ensure_ascii = False
    app.config.update(
        SECRET_KEY=test_config.get("SECRET_KEY") or _load_or_create_secret(data_dir),
        DATABASE=str(test_config.get("DATABASE") or data_dir / "garden.sqlite3"),
        DATA_DIR=str(data_dir),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("GARDEN_COOKIE_SECURE") == "1",
        MAX_CONTENT_LENGTH=2 * 1024 * 1024,
    )
    if test_config.get("TESTING"):
        app.config.update(TESTING=True)
    init_db(app.config["DATABASE"])

    @app.teardown_appcontext
    def close_db(_error=None):
        database = g.pop("db", None)
        if database is not None:
            database.close()

    def get_db():
        if "db" not in g:
            g.db = connect_db(app.config["DATABASE"])
        return g.db

    def current_user():
        user_id = session.get("user_id")
        if not user_id:
            return None
        return get_db().execute(
            "SELECT id, username, created_at, last_login_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    def csrf_token() -> str:
        token = session.get("_csrf_token")
        if not token:
            token = secrets.token_urlsafe(32)
            session["_csrf_token"] = token
        return token

    def csrf_ok(token: str | None) -> bool:
        expected = session.get("_csrf_token")
        return bool(expected and token and hmac.compare_digest(expected, token))

    app.jinja_env.globals["csrf_token"] = csrf_token

    def login_required(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if not current_user():
                session.clear()
                return redirect(url_for("login"))
            return view(*args, **kwargs)

        return wrapped

    @app.get("/")
    @login_required
    def game():
        user = current_user()
        row = get_db().execute(
            "SELECT payload, updated_at FROM saves WHERE user_id = ?",
            (user["id"],),
        ).fetchone()
        save_data = json.loads(row["payload"]) if row else None
        account = {
            "id": user["id"],
            "username": user["username"],
            "csrfToken": csrf_token(),
            "database": "SQLite",
        }
        payload = {"account": account, "save": save_data}
        encoded = json.dumps(payload, ensure_ascii=False).replace("</", "<\\/")
        html = (WEB_ROOT / "index.html").read_text(encoding="utf-8")
        if INDEX_PLACEHOLDER not in html:
            raise RuntimeError("www/index.html 缺少 ACCOUNT_BOOTSTRAP 占位符")
        html = html.replace(
            INDEX_PLACEHOLDER,
            '<script type="application/json" id="account-bootstrap">' + encoded + "</script>",
        )
        response = app.make_response(html)
        response.headers["Content-Type"] = "text/html; charset=utf-8"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if current_user():
            return redirect(url_for("game"))
        username = ""
        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            if not csrf_ok(request.form.get("csrf_token")):
                flash("页面已过期，请重新提交。", "error")
            else:
                user = get_db().execute(
                    "SELECT * FROM users WHERE username = ?",
                    (username,),
                ).fetchone()
                if user and check_password_hash(user["password_hash"], password):
                    session.clear()
                    session["user_id"] = user["id"]
                    session["_csrf_token"] = secrets.token_urlsafe(32)
                    get_db().execute(
                        "UPDATE users SET last_login_at = ? WHERE id = ?",
                        (utc_now(), user["id"]),
                    )
                    get_db().commit()
                    return redirect(url_for("game"))
                flash("用户名或密码不正确。", "error")
        return render_template("login.html", username=username)

    @app.route("/register", methods=["GET", "POST"])
    def register():
        if current_user():
            return redirect(url_for("game"))
        username = ""
        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            confirmation = request.form.get("confirmation", "")
            error = None
            if not csrf_ok(request.form.get("csrf_token")):
                error = "页面已过期，请重新提交。"
            elif not USERNAME_RE.match(username):
                error = "用户名需要 3–20 位，只能使用中文、字母、数字或下划线。"
            elif len(password) < 6:
                error = "密码至少需要 6 位。"
            elif len(password) > 128:
                error = "密码过长。"
            elif password != confirmation:
                error = "两次输入的密码不一样。"
            else:
                database = get_db()
                try:
                    cursor = database.execute(
                        "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
                        (username, generate_password_hash(password), utc_now()),
                    )
                    database.commit()
                except sqlite3.IntegrityError:
                    error = "这个用户名已经被使用了。"
                else:
                    session.clear()
                    session["user_id"] = cursor.lastrowid
                    session["_csrf_token"] = secrets.token_urlsafe(32)
                    return redirect(url_for("game"))
            if error:
                flash(error, "error")
        return render_template("register.html", username=username)

    @app.post("/logout")
    def logout():
        if not current_user():
            return redirect(url_for("login"))
        token = request.headers.get(CSRF_HEADER) or request.form.get("csrf_token")
        if not csrf_ok(token):
            return jsonify({"ok": False, "error": "csrf"}), 403
        session.clear()
        return jsonify({"ok": True})

    @app.post("/api/save")
    def api_save():
        user = current_user()
        if not user:
            return jsonify({"ok": False, "error": "auth"}), 401
        if not csrf_ok(request.headers.get(CSRF_HEADER)):
            return jsonify({"ok": False, "error": "csrf"}), 403
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict) or "player" not in payload or "garden" not in payload:
            return jsonify({"ok": False, "error": "invalid_save"}), 400
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        if len(encoded.encode("utf-8")) > MAX_SAVE_BYTES:
            return jsonify({"ok": False, "error": "too_large"}), 413
        updated_at = utc_now()
        database = get_db()
        database.execute(
            """
            INSERT INTO saves (user_id, payload, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
            """,
            (user["id"], encoded, updated_at),
        )
        database.commit()
        return jsonify({"ok": True, "updatedAt": updated_at})

    @app.get("/api/save")
    @login_required
    def api_get_save():
        user = current_user()
        row = get_db().execute(
            "SELECT payload, updated_at FROM saves WHERE user_id = ?",
            (user["id"],),
        ).fetchone()
        if not row:
            return jsonify({"ok": True, "save": None, "updatedAt": None})
        return jsonify({"ok": True, "save": json.loads(row["payload"]), "updatedAt": row["updated_at"]})

    @app.get("/health")
    def health():
        return jsonify({"ok": True, "database": "sqlite"})

    @app.get("/<path:filename>")
    def static_files(filename: str):
        if filename in {"index.html", "login", "register"}:
            return redirect(url_for("game"))
        return send_from_directory(WEB_ROOT, filename, conditional=True)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "same-origin")
        if request.endpoint in {"game", "login", "register"}:
            response.headers["Cache-Control"] = "no-store"
        return response

    return app


if __name__ == "__main__":
    host = os.environ.get("GARDEN_HOST", "127.0.0.1")
    port = int(os.environ.get("GARDEN_PORT", "8000"))
    application = create_app()
    print(f"小满花园账号版：http://{host}:{port}")
    print(f"SQLite 数据库：{application.config['DATABASE']}")
    application.run(host=host, port=port, debug=False, threaded=True)
