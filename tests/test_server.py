"""本地 Flask 账号服务和 SQLite 存档的接口测试。"""

from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.app import create_app  # noqa: E402


class AccountServerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        data_dir = Path(self.temp.name)
        self.app = create_app({
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "DATA_DIR": str(data_dir),
            "DATABASE": str(data_dir / "test.sqlite3"),
        })
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        self.temp.cleanup()

    @staticmethod
    def _csrf(html: str) -> str:
        match = re.search(r'name="csrf_token" value="([^"]+)"', html)
        if not match:
            raise AssertionError("页面中没有 csrf_token")
        return match.group(1)

    def _register(self, username: str = "园丁小明", password: str = "secret123"):
        page = self.client.get("/register")
        self.assertEqual(page.status_code, 200)
        token = self._csrf(page.get_data(as_text=True))
        return self.client.post(
            "/register",
            data={
                "csrf_token": token,
                "username": username,
                "password": password,
                "confirmation": password,
            },
            follow_redirects=False,
        )

    def _login(self, username: str, password: str):
        page = self.client.get("/login")
        token = self._csrf(page.get_data(as_text=True))
        return self.client.post(
            "/login",
            data={"csrf_token": token, "username": username, "password": password},
            follow_redirects=False,
        )

    def _account_payload(self):
        page = self.client.get("/")
        self.assertEqual(page.status_code, 200)
        html = page.get_data(as_text=True)
        match = re.search(
            r'<script type="application/json" id="account-bootstrap">(.*?)</script>',
            html,
            re.S,
        )
        self.assertIsNotNone(match, "首页没有注入账号数据")
        return json.loads(match.group(1))

    def test_register_login_and_save_round_trip(self):
        response = self._register()
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], "/")

        payload = self._account_payload()
        self.assertEqual(payload["account"]["username"], "园丁小明")
        self.assertIsNone(payload["save"])

        save = {
            "player": {"name": "小明", "coins": 99},
            "garden": [{"flowerId": "daisy"}],
            "updatedAt": 1234567890,
        }
        saved = self.client.post(
            "/api/save",
            json=save,
            headers={"X-CSRF-Token": payload["account"]["csrfToken"]},
        )
        self.assertEqual(saved.status_code, 200)
        self.assertTrue(saved.get_json()["ok"])

        logged_out = self.client.post(
            "/logout",
            headers={"X-CSRF-Token": payload["account"]["csrfToken"]},
        )
        self.assertEqual(logged_out.status_code, 200)
        self.assertEqual(self.client.get("/").status_code, 302)

        self.assertEqual(self._login("园丁小明", "secret123").status_code, 302)
        payload_after_login = self._account_payload()
        self.assertEqual(payload_after_login["save"], save)

    def test_duplicate_username_and_wrong_password(self):
        self.assertEqual(self._register("重复名字").status_code, 302)
        self.client.post("/logout", headers={"X-CSRF-Token": self._account_payload()["account"]["csrfToken"]})
        self.assertEqual(self._register("重复名字").status_code, 200)
        self.assertIn("已经被使用", self._register("重复名字").get_data(as_text=True))
        self.assertEqual(self._login("重复名字", "wrong-password").status_code, 200)
        self.assertIn("用户名或密码不正确", self._login("重复名字", "wrong-password").get_data(as_text=True))

    def test_save_requires_csrf_and_login(self):
        self.assertEqual(self.client.get("/api/save").status_code, 302)
        self._register()
        response = self.client.post("/api/save", json={"player": {}, "garden": []})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            self.client.post("/api/save", json={"nope": True}, headers={"X-CSRF-Token": self._account_payload()["account"]["csrfToken"]}).status_code,
            400,
        )

    def test_password_is_not_plaintext_in_database(self):
        self._register("密码测试", "very-secret")
        import sqlite3
        from contextlib import closing

        with closing(sqlite3.connect(self.app.config["DATABASE"])) as connection:
            stored = connection.execute(
                "SELECT password_hash FROM users WHERE username = ?", ("密码测试",)
            ).fetchone()[0]
        self.assertNotEqual(stored, "very-secret")
        self.assertTrue(stored.startswith(("scrypt:", "pbkdf2:")))


if __name__ == "__main__":
    unittest.main()
