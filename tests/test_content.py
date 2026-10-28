"""检查 Python 内容源、生成结果和展示资源之间的一致性。"""

from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from content import garden  # noqa: E402
from tools.build_content import FLOWER_FIELDS, OUTPUT, build_data, render_js  # noqa: E402

ALLOWED_SHAPES = {"daisy", "tulip", "hyacinth", "rose", "sunflower", "hydrangea", "lily"}
COLOR_KEYS = {"petal", "petalAlt", "center", "centerAlt", "stem", "leaf", "accent"}
HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


class GardenContentTests(unittest.TestCase):
    def test_flowers_are_complete_and_unique(self) -> None:
        data = build_data()
        flowers = data["flowers"]
        self.assertGreaterEqual(len(flowers), 7)
        ids = [flower["id"] for flower in flowers]
        self.assertEqual(len(ids), len(set(ids)), "花 id 不能重复")

        for flower in flowers:
            for field in FLOWER_FIELDS:
                self.assertIn(field, flower, f"{flower.get('id')} 缺少 {field}")
            self.assertIn(flower["shape"], ALLOWED_SHAPES)
            self.assertGreater(flower["seedPrice"], 0)
            self.assertGreater(flower["sellPrice"], 0)
            self.assertGreater(flower["realGrowDays"], 0)
            self.assertGreater(flower["realBloomDays"], 0)
            self.assertGreaterEqual(flower["bonusSeedChance"], 0)
            self.assertLessEqual(flower["bonusSeedChance"], 1)
            self.assertEqual(set(flower["colors"]), COLOR_KEYS)
            for key, value in flower["colors"].items():
                self.assertRegex(value, HEX_COLOR, f"{flower['id']}.{key} 不是六位色值")
            self.assertTrue(flower["blurb"].strip())
            self.assertTrue(flower["language"].strip())

    def test_derived_times_and_maps(self) -> None:
        data = build_data()
        self.assertEqual(data["timeScale"], garden.TIME_SCALE)
        self.assertEqual(data["realDaySeconds"], garden.REAL_DAY_SECONDS)
        for flower in data["flowers"]:
            expected_grow = round(flower["realGrowDays"] * garden.REAL_DAY_SECONDS * garden.TIME_SCALE)
            expected_bloom = round(flower["realBloomDays"] * garden.REAL_DAY_SECONDS * garden.TIME_SCALE)
            self.assertEqual(flower["growSeconds"], expected_grow)
            self.assertEqual(flower["bloomSeconds"], expected_bloom)
        self.assertEqual(set(data["flowerMap"]), {flower["id"] for flower in data["flowers"]})
        for flower in data["flowers"]:
            self.assertIs(data["flowerMap"][flower["id"]], flower)

    def test_rewards_and_quests_reference_existing_flowers(self) -> None:
        ids = {flower["id"] for flower in build_data()["flowers"]}
        days = [reward["day"] for reward in garden.DATA["checkinRewards"]]
        self.assertEqual(days, list(range(1, len(days) + 1)), "签到奖励应当从第 1 天连续排列")
        for reward in garden.DATA["checkinRewards"]:
            for flower_id in reward.get("seeds", {}):
                self.assertIn(flower_id, ids, f"签到第 {reward['day']} 天引用了不存在的花")

        valid_metrics = {"water", "harvest", "fertilizer"}
        for quest in garden.DATA["dailyQuests"]:
            self.assertIn(quest["metric"], valid_metrics)
            self.assertGreater(quest["target"], 0)

    def test_item_grades_templates_and_wear_bands(self) -> None:
        data = build_data()
        grades = data["itemGrades"]
        templates = data["itemTemplates"]
        self.assertGreaterEqual(len(grades), 5)
        self.assertGreaterEqual(len(templates), 6)
        self.assertEqual(sum(grade["weight"] for grade in grades), 100)
        self.assertEqual(sum(template["weight"] for template in templates), 100)
        self.assertEqual(len({grade["id"] for grade in grades}), len(grades))
        self.assertEqual(len({template["id"] for template in templates}), len(templates))
        for grade in grades:
            self.assertGreater(grade["multiplier"], 0)
            self.assertRegex(grade["color"], HEX_COLOR)
        for template in templates:
            self.assertRegex(template["tint"], HEX_COLOR)
            self.assertGreater(template["weight"], 0)
        bands = data["wearBands"]
        self.assertGreaterEqual(len(bands), 4)
        self.assertEqual([band["max"] for band in bands], sorted(band["max"] for band in bands))
        self.assertGreaterEqual(bands[-1]["max"], 1)

    def test_generated_data_file_is_in_sync(self) -> None:
        expected = render_js(build_data())
        actual = OUTPUT.read_text(encoding="utf-8")
        self.assertEqual(
            actual,
            expected,
            "www/js/data.js 和 content/garden.py 不同步；请运行 python tools/build_content.py",
        )


if __name__ == "__main__":
    unittest.main()
