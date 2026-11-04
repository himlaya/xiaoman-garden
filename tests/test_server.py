"""本地 Flask 账号服务和 SQLite 存档的接口测试。"""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import unittest
import uuid
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.app import create_app  # noqa: E402
from server.db import connect_db  # noqa: E402


class DatabaseTestCase(unittest.TestCase):
    postgres_url = None

    def make_app(self, config):
        if self.postgres_url:
            import psycopg
            schema = "garden_test_" + uuid.uuid4().hex
            with psycopg.connect(self.postgres_url, autocommit=True) as connection:
                connection.execute(f'CREATE SCHEMA "{schema}"')

            def cleanup_schema():
                with psycopg.connect(self.postgres_url, autocommit=True) as connection:
                    connection.execute(f'DROP SCHEMA "{schema}" CASCADE')

            self.addCleanup(cleanup_schema)
            parts = urlsplit(self.postgres_url)
            query = dict(parse_qsl(parts.query))
            query["options"] = f"-c search_path={schema}"
            config["DATABASE"] = urlunsplit(parts._replace(query=urlencode(query)))
        return create_app(config)


class AccountServerTests(DatabaseTestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        data_dir = Path(self.temp.name)
        self.app = self.make_app({
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
            headers={"X-CSRF-Token": payload["account"]["csrfToken"], "X-Save-Revision": "0"},
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
        from contextlib import closing

        with closing(connect_db(self.app.config["DATABASE"])) as connection:
            stored = connection.execute(
                "SELECT password_hash FROM users WHERE username = ?", ("密码测试",)
            ).fetchone()["password_hash"]
        self.assertNotEqual(stored, "very-secret")
        self.assertTrue(stored.startswith(("scrypt:", "pbkdf2:")))


if __name__ == "__main__":
    unittest.main()

class MarketServerTests(DatabaseTestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        data_dir = Path(self.temp.name)
        self.app = self.make_app({
            "TESTING": True,
            "SECRET_KEY": "market-test-secret",
            "DATA_DIR": str(data_dir),
            "DATABASE": str(data_dir / "market.sqlite3"),
        })
        self.seller = self.app.test_client()
        self.buyer = self.app.test_client()
        self._register(self.seller, "卖家阿青")
        self._register(self.buyer, "买家小小")

    def tearDown(self) -> None:
        self.temp.cleanup()

    @staticmethod
    def _csrf(html: str) -> str:
        match = re.search(r'name="csrf_token" value="([^"]+)"', html)
        if not match:
            raise AssertionError("页面中没有 csrf_token")
        return match.group(1)

    def _register(self, client, username: str):
        page = client.get("/register")
        token = self._csrf(page.get_data(as_text=True))
        response = client.post(
            "/register",
            data={
                "csrf_token": token,
                "username": username,
                "password": "secret123",
                "confirmation": "secret123",
            },
            follow_redirects=False,
        )
        self.assertEqual(response.status_code, 302)

    @staticmethod
    def _item(item_id: str = "itm_market_test_1"):
        return {
            "id": item_id,
            "kind": "seed",
            "flowerId": "daisy",
            "grade": "rare",
            "templateId": "frost",
            "patternSeed": 123456,
            "wear": 0.12,
            "createdAt": 1000,
            "provenance": {"grower": "卖家阿青", "source": "shop"},
        }

    @staticmethod
    def _save(coins: int, items: list):
        return {
            "player": {"name": "测试园丁", "coins": coins},
            "garden": [None, None, None, None],
            "items": items,
            "updatedAt": 1000,
        }

    def _payload(self, client):
        page = client.get("/")
        self.assertEqual(page.status_code, 200)
        match = re.search(
            r'<script type="application/json" id="account-bootstrap">(.*?)</script>',
            page.get_data(as_text=True),
            re.S,
        )
        self.assertIsNotNone(match)
        return json.loads(match.group(1))

    def _put_save(self, client, payload):
        account = self._payload(client)
        response = client.post(
            "/api/save",
            json=payload,
            headers={"X-CSRF-Token": account["account"]["csrfToken"],
                     "X-Save-Revision": str(account["account"]["saveRevision"])},
        )
        self.assertEqual(response.status_code, 200)
        return account

    def _market_action(self, client, action: str, body: dict):
        account = self._payload(client)
        return client.post(
            "/api/market/" + action,
            json=body,
            headers={"X-CSRF-Token": account["account"]["csrfToken"]},
        )

    def test_list_buy_and_ownership_transfer(self):
        seller_item = self._item()
        self._put_save(self.seller, self._save(10, [seller_item]))
        self._put_save(self.buyer, self._save(200, []))

        listed = self._market_action(self.seller, "list", {"itemId": seller_item["id"], "price": 50})
        self.assertEqual(listed.status_code, 200)
        listed_data = listed.get_json()
        self.assertTrue(listed_data["ok"])
        self.assertEqual(listed_data["save"]["items"], [])
        listing_id = listed_data["listing"]["id"]

        market = self.buyer.get("/api/market").get_json()
        self.assertEqual(len(market["listings"]), 1)
        self.assertEqual(market["listings"][0]["item"]["id"], seller_item["id"])

        bought = self._market_action(self.buyer, "buy", {"listingId": listing_id})
        self.assertEqual(bought.status_code, 200)
        buyer_save = bought.get_json()["save"]
        self.assertEqual(buyer_save["player"]["coins"], 150)
        self.assertEqual(buyer_save["items"][0]["id"], seller_item["id"])

        seller_save = self._payload(self.seller)["save"]
        self.assertEqual(seller_save["player"]["coins"], 60)
        self.assertEqual(seller_save["items"], [])
        self.assertEqual(self.buyer.get("/api/market").get_json()["listings"], [])

    def test_cancel_returns_item_and_self_buy_is_rejected(self):
        item = self._item()
        self._put_save(self.seller, self._save(10, [item]))
        listed = self._market_action(self.seller, "list", {"itemId": item["id"], "price": 30}).get_json()
        listing_id = listed["listing"]["id"]

        own_buy = self._market_action(self.seller, "buy", {"listingId": listing_id})
        self.assertEqual(own_buy.status_code, 400)
        self.assertEqual(own_buy.get_json()["error"], "own_listing")

        cancelled = self._market_action(self.seller, "cancel", {"listingId": listing_id})
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(cancelled.get_json()["save"]["items"][0]["id"], item["id"])

        # 已下架的挂单不能再次购买
        missing = self._market_action(self.buyer, "buy", {"listingId": listing_id})
        self.assertEqual(missing.status_code, 404)

    def test_market_requires_csrf_and_escrow_cannot_be_duplicated(self):
        item = self._item()
        self._put_save(self.seller, self._save(10, [item]))
        no_csrf = self.seller.post("/api/market/list", json={"itemId": item["id"], "price": 30})
        self.assertEqual(no_csrf.status_code, 403)

        listed = self._market_action(self.seller, "list", {"itemId": item["id"], "price": 30}).get_json()
        self.assertTrue(listed["ok"])

        # 旧存档再次上传也不能把托管中的物品复制回来。
        self._put_save(self.seller, self._save(999, [item]))
        seller_save = self._payload(self.seller)["save"]
        self.assertEqual(seller_save["items"], [])
        self.assertEqual(seller_save["player"]["coins"], 999)

    def test_listing_price_validation(self):
        item = self._item()
        self._put_save(self.seller, self._save(10, [item]))
        for price in (0, -1, 100000, "50", True):
            response = self._market_action(self.seller, "list", {"itemId": item["id"], "price": price})
            self.assertEqual(response.status_code, 400, price)

    def test_stale_save_cannot_undo_sale(self):
        item = self._item()
        self._put_save(self.seller, self._save(10, [item]))
        self._put_save(self.buyer, self._save(200, []))
        listed = self._market_action(self.seller, "list", {"itemId": item["id"], "price": 50}).get_json()
        old_seller = self._payload(self.seller)
        self.assertEqual(self._market_action(self.buyer, "buy", {"listingId": listed["listing"]["id"]}).status_code, 200)
        response = self.seller.post("/api/save", json=old_seller["save"], headers={
            "X-CSRF-Token": old_seller["account"]["csrfToken"],
            "X-Save-Revision": str(old_seller["account"]["saveRevision"]),
        })
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.get_json()["error"], "save_conflict")
        self.assertEqual(self._payload(self.seller)["save"]["player"]["coins"], 60)

    def test_failed_purchase_does_not_change_either_save(self):
        item = self._item()
        self._put_save(self.seller, self._save(10, [item]))
        self._put_save(self.buyer, self._save(1, []))
        listed = self._market_action(self.seller, "list", {"itemId": item["id"], "price": 50}).get_json()
        response = self._market_action(self.buyer, "buy", {"listingId": listed["listing"]["id"]})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self._payload(self.seller)["save"]["player"]["coins"], 10)
        self.assertEqual(self._payload(self.buyer)["save"]["player"]["coins"], 1)
        self.assertEqual(len(self.buyer.get("/api/market").get_json()["listings"]), 1)

    def test_account_survives_application_restart(self):
        self._put_save(self.seller, self._save(42, []))
        restarted = create_app({
            "TESTING": True, "SECRET_KEY": self.app.config["SECRET_KEY"],
            "DATA_DIR": self.app.config["DATA_DIR"], "DATABASE": self.app.config["DATABASE"],
        }).test_client()
        page = restarted.get("/login")
        response = restarted.post("/login", data={
            "csrf_token": self._csrf(page.get_data(as_text=True)),
            "username": "卖家阿青", "password": "secret123",
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self._payload(restarted)["save"]["player"]["coins"], 42)

    def test_two_buyers_only_one_can_buy_same_listing(self):
        from concurrent.futures import ThreadPoolExecutor

        other = self.app.test_client()
        self._register(other, "另一位买家")
        item = self._item()
        self._put_save(self.seller, self._save(10, [item]))
        self._put_save(self.buyer, self._save(200, []))
        self._put_save(other, self._save(200, []))
        listed = self._market_action(self.seller, "list", {"itemId": item["id"], "price": 50}).get_json()
        listing_id = listed["listing"]["id"]
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = list(pool.map(
                lambda client: self._market_action(client, "buy", {"listingId": listing_id}),
                [self.buyer, other],
            ))
        self.assertEqual(sorted(response.status_code for response in responses), [200, 404])
        buyer_saves = [self._payload(client)["save"] for client in (self.buyer, other)]
        self.assertEqual(sum(save["player"]["coins"] for save in buyer_saves), 350)
        self.assertEqual(sum(len(save["items"]) for save in buyer_saves), 1)
        self.assertEqual(self._payload(self.seller)["save"]["player"]["coins"], 60)


@unittest.skipUnless(os.environ.get("GARDEN_TEST_DATABASE_URL"), "需要独立的 PostgreSQL 测试库")
class PostgresAccountTests(AccountServerTests):
    postgres_url = os.environ.get("GARDEN_TEST_DATABASE_URL")


@unittest.skipUnless(os.environ.get("GARDEN_TEST_DATABASE_URL"), "需要独立的 PostgreSQL 测试库")
class PostgresMarketTests(MarketServerTests):
    postgres_url = os.environ.get("GARDEN_TEST_DATABASE_URL")


class DeploymentConfigTests(unittest.TestCase):
    def test_free_deploy_refuses_ephemeral_sqlite(self):
        from unittest.mock import patch
        with patch.dict(os.environ, {"GARDEN_REQUIRE_CLOUD_DB": "1"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "DATABASE_URL"):
                create_app({"TESTING": True})

    def test_cloud_deploy_requires_stable_session_secret(self):
        from unittest.mock import patch
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "GARDEN_SECRET_KEY"):
                create_app({"DATABASE": "postgresql://unused.invalid/test", "TESTING": True})

    def test_old_sqlite_schema_is_upgraded_without_losing_saves(self):
        import sqlite3
        from server.db import SCHEMA, init_db
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "legacy.sqlite3"
            with sqlite3.connect(database) as connection:
                connection.executescript(SCHEMA.replace("    revision INTEGER NOT NULL DEFAULT 0,\n", ""))
                connection.execute("INSERT INTO users VALUES (7, 'legacy', 'hash', 'today', NULL)")
                connection.execute("INSERT INTO saves VALUES (7, '{}', 'today')")
            init_db(database)
            init_db(database)
            connection = connect_db(database)
            try:
                row = connection.execute("SELECT * FROM saves WHERE user_id = 7").fetchone()
                self.assertEqual(row["payload"], "{}")
                self.assertEqual(row["revision"], 0)
            finally:
                connection.close()


@unittest.skipUnless(os.environ.get("GARDEN_TEST_DATABASE_URL"), "需要独立的 PostgreSQL 测试库")
class PostgresMigrationTests(DatabaseTestCase):
    postgres_url = os.environ.get("GARDEN_TEST_DATABASE_URL")

    def test_migrate_keeps_old_accounts_and_refuses_overwrite(self):
        import sqlite3
        from server.db import SCHEMA
        from tools.migrate_to_postgres import migrate
        with tempfile.TemporaryDirectory() as directory:
            self.app = self.make_app({
                "TESTING": True, "SECRET_KEY": "migration-test", "DATA_DIR": directory,
            })
            source = Path(directory) / "legacy.sqlite3"
            with sqlite3.connect(source) as connection:
                connection.executescript(SCHEMA.replace("    revision INTEGER NOT NULL DEFAULT 0,\n", ""))
                connection.execute("INSERT INTO users VALUES (7, 'legacy', 'original-password-hash', 'today', NULL)")
                connection.execute("INSERT INTO saves VALUES (7, ?, 'today')", (json.dumps({"player": {"coins": 42}, "garden": [], "items": []}),))
                connection.execute("INSERT INTO market_listings (id, seller_id, item_id, item_json, price, created_at) VALUES (12, 7, 'escrow', '{}', 5, 'today')")
            target = self.app.config["DATABASE"]
            self.assertEqual(migrate(source, target), {"users": 1, "saves": 1, "market_listings": 1})
            connection = connect_db(target)
            try:
                self.assertEqual(connection.execute("SELECT password_hash FROM users WHERE id=7").fetchone()["password_hash"], "original-password-hash")
                self.assertEqual(connection.execute("SELECT revision FROM saves WHERE user_id=7").fetchone()["revision"], 0)
                self.assertEqual(connection.execute("SELECT status FROM market_listings WHERE id=12").fetchone()["status"], "active")
                row = connection.execute("INSERT INTO users (username,password_hash,created_at) VALUES ('next','hash','today') RETURNING id").fetchone()
                self.assertEqual(row["id"], 8)
            finally:
                connection.close()
            with self.assertRaisesRegex(ValueError, "已有账号"):
                migrate(source, target)
