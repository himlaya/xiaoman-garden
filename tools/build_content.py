"""把小小花园的 Python 内容源生成为前端使用的 www/js/data.js。

用法：
    python tools/build_content.py           # 生成
    python tools/build_content.py --check   # 只检查是否同步，不写文件
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from content import garden  # noqa: E402

OUTPUT = ROOT / "www" / "js" / "data.js"

HEADER = """/* 小小花园 · 数据
 *
 * 这个文件由 content/garden.py 自动生成，请不要直接编辑。
 * 修改内容后运行：
 *     python tools/build_content.py
 */
"""

FLOWER_FIELDS = [
    "id", "name", "en", "rarity", "shape", "seedPrice", "sellPrice",
    "realGrowDays", "realBloomDays", "xp", "bonusSeedChance", "colors",
    "blurb", "language", "cardLine",
]


def _seconds_for_real_days(days: float) -> int:
    return round(days * garden.REAL_DAY_SECONDS * garden.TIME_SCALE)


def build_data() -> dict:
    """把内容源计算成前端需要的 GameData 结构。"""
    data = copy.deepcopy(garden.DATA)
    flowers = []
    for source in copy.deepcopy(garden.FLOWERS):
        missing = [field for field in FLOWER_FIELDS if field not in source]
        if missing:
            raise ValueError(f"花 {source.get('id', '?')} 缺少字段：{', '.join(missing)}")
        flower = {field: source[field] for field in FLOWER_FIELDS}
        flower["growSeconds"] = _seconds_for_real_days(flower["realGrowDays"])
        flower["bloomSeconds"] = _seconds_for_real_days(flower["realBloomDays"])
        flowers.append(flower)

    ids = [flower["id"] for flower in flowers]
    if len(ids) != len(set(ids)):
        raise ValueError("花的 id 有重复：" + ", ".join(ids))

    data["flowers"] = flowers
    data["flowerMap"] = {flower["id"]: flower for flower in flowers}
    data["timeScale"] = garden.TIME_SCALE
    data["realDaySeconds"] = garden.REAL_DAY_SECONDS
    return data


def render_js(data: dict) -> str:
    """生成稳定的 JavaScript 文件内容。"""
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    return (
        HEADER
        + "\nwindow.GameData = " + payload + ";\n\n"
        + "window.GameData.gameSecondsForRealDays = function (days) {\n"
        + "  return Math.round(Number(days) * window.GameData.realDaySeconds * window.GameData.timeScale);\n"
        + "};\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="生成小小花园前端数据")
    parser.add_argument("--check", action="store_true", help="只检查 www/js/data.js 是否和内容源一致")
    args = parser.parse_args()

    rendered = render_js(build_data())
    current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""

    if args.check:
        if current != rendered:
            print("内容源和 www/js/data.js 不同步。请运行：python tools/build_content.py")
            return 1
        print("内容源已同步：www/js/data.js")
        return 0

    if current == rendered:
        print("没有变化：www/js/data.js")
        return 0

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(rendered, encoding="utf-8", newline="\n")
    print(f"已生成：{OUTPUT.relative_to(ROOT)}")
    print(f"花种数量：{len(build_data()['flowers'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
