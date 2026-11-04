"""将旧 SQLite 账号/存档/挂单迁移到空的 PostgreSQL；不覆盖已有云端数据。"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.db import connect_db, init_db, is_postgres


def migrate(source: Path, target: str) -> dict:
    if not is_postgres(target):
        raise ValueError("请通过 DATABASE_URL 设置目标 PostgreSQL 数据库")
    if not source.is_file():
        raise ValueError("没有找到源 SQLite 文件")
    old = sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True)
    old.row_factory = sqlite3.Row
    init_db(target)
    new = connect_db(target)
    try:
        old.execute("BEGIN")
        new.execute("BEGIN")
        new.execute("LOCK TABLE users, saves, market_listings IN ACCESS EXCLUSIVE MODE")
        for table in ("users", "saves", "market_listings"):
            if new.execute(f"SELECT count(*) AS n FROM {table}").fetchone()["n"]:
                raise ValueError("目标数据库已有账号或交易，已取消迁移，不会覆盖")
        columns = {
            "users": ["id", "username", "password_hash", "created_at", "last_login_at"],
            "saves": ["user_id", "payload", "updated_at", "revision"],
            "market_listings": ["id", "seller_id", "item_id", "item_json", "price", "status", "created_at", "buyer_id", "sold_at"],
        }
        counts = {}
        for table, fields in columns.items():
            rows = old.execute(f"SELECT * FROM {table}").fetchall()
            for row in rows:
                data = dict(row)
                if table == "saves":
                    data.setdefault("revision", 0)
                new.execute(
                    f"INSERT INTO {table} ({', '.join(fields)}) VALUES ({', '.join('?' for _ in fields)})",
                    tuple(data[field] for field in fields),
                )
            counts[table] = len(rows)
        for table in ("users", "market_listings"):
            new.execute(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {table}), 1), EXISTS(SELECT 1 FROM {table}))"
            )
        new.commit()
        return counts
    except Exception:
        new.rollback()
        raise
    finally:
        old.close()
        new.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sqlite", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = migrate(args.sqlite, os.environ.get("DATABASE_URL", ""))
    except ValueError as error:
        parser.exit(1, f"{error}\n")
    except Exception:
        # 数据库异常可能包含连接信息或账号字段，不在控制台泄露。
        parser.exit(1, "迁移失败，已回滚。请检查连接、源数据库结构及目标数据库状态。\n")
    print("迁移完成：" + "，".join(f"{name}={count}" for name, count in result.items()))


if __name__ == "__main__":
    main()
