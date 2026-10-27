#!/usr/bin/env python3
"""小满花园 · Python 一键发版。

用法：
    python tools/publish.py 0.3.0 3
    python tools/publish.py 0.3.0 3 --dry-run

流程：
1. 从 content/garden.py 生成 www/js/data.js
2. 跑内容测试 + JS 测试
3. 更新网页和三端版本号
4. 同步三端网页资源
5. git add / commit / push，触发 GitHub Actions
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "www" / "version.json"
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")


def _prepend_tools_path() -> dict[str, str]:
    env = os.environ.copy()
    candidates = [
        ROOT / ".tools" / "minigit" / "cmd",
        ROOT / ".tools" / "gh" / "bin",
    ]
    existing = [str(path) for path in candidates if path.exists()]
    if existing:
        env["PATH"] = os.pathsep.join(existing + [env.get("PATH", "")])
    env["PYTHONUTF8"] = "1"
    return env


def _find_command(name: str, env: dict[str, str]) -> str | None:
    if os.name == "nt":
        names = [name + ".cmd", name + ".exe", name]
    else:
        names = [name]
    for candidate in names:
        found = shutil.which(candidate, path=env.get("PATH"))
        if found:
            return found
    return None


def _run(command: list[str], env: dict[str, str]) -> int:
    print("\n$ " + " ".join(command))
    result = subprocess.run(command, cwd=ROOT, env=env, text=True)
    return result.returncode


def _fail(message: str) -> None:
    print("\n发布中止：" + message)
    raise SystemExit(1)


def _read_current_version() -> tuple[str, int]:
    if not VERSION_FILE.exists():
        _fail("找不到 www/version.json")
    data = json.loads(VERSION_FILE.read_text(encoding="utf-8"))
    return str(data.get("version", "0.0.0")), int(data.get("build", 0))


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="发布小满花园新版本")
    parser.add_argument("version", nargs="?", help="新版本号，例如 0.3.0")
    parser.add_argument("build", nargs="?", type=int, help="新的构建号，必须大于当前构建号")
    parser.add_argument("--dry-run", action="store_true", help="只构建和测试，不改版本、不提交")
    return parser.parse_args()


def _ask_missing(args: argparse.Namespace) -> None:
    current_version, current_build = _read_current_version()
    if not args.version:
        if not sys.stdin.isatty():
            _fail("缺少版本号，例如：python tools/publish.py 0.3.0 3")
        args.version = input(f"新版本号（当前 {current_version}）：").strip()
    if args.build is None:
        if not sys.stdin.isatty():
            _fail("缺少构建号，例如：python tools/publish.py 0.3.0 3")
        args.build = int(input(f"新构建号（必须大于 {current_build}）：").strip())


def main() -> int:
    args = _parse_args()
    _ask_missing(args)

    version = str(args.version).strip()
    build = int(args.build)
    if not SEMVER.match(version):
        _fail("版本号必须像 0.3.0 这样")
    if build <= 0:
        _fail("构建号必须是正整数")

    current_version, current_build = _read_current_version()
    if build <= current_build:
        _fail(f"构建号必须大于当前构建号 {current_build}，否则线上客户端不会自动更新")
    current_tuple = tuple(int(part) for part in current_version.split("."))
    next_tuple = tuple(int(part) for part in version.split("."))
    if next_tuple < current_tuple:
        _fail(f"版本号不能低于当前版本 {current_version}")

    env = _prepend_tools_path()
    python = sys.executable
    npm = _find_command("npm", env)
    git = _find_command("git", env)
    if not npm:
        _fail("找不到 npm，请确认 Node.js 已安装")
    if not git:
        _fail("找不到 git；可以把便携版放在 .tools/minigit/cmd，或安装 Git")

    print("小满花园 · Python 发版")
    print(f"当前：{current_version} build {current_build}")
    print(f"目标：{version} build {build}")
    if args.dry_run:
        print("模式：dry-run（不会修改版本、不会提交）")

    steps = [
        [python, str(ROOT / "tools" / "build_content.py")],
        [npm, "test"],
    ]
    for command in steps:
        if _run(command, env) != 0:
            _fail("构建或测试失败，请先修复上面的错误")

    if args.dry_run:
        print("\n[OK] dry-run 通过。真正发版请去掉 --dry-run。")
        return 0

    commands = [
        [npm, "run", "version:set", "--", version, str(build)],
        [npm, "run", "sync:native"],
        [git, "add", "-A"],
        [git, "commit", "-m", f"release: v{version} build {build}"],
        [git, "push"],
    ]
    for command in commands:
        if _run(command, env) != 0:
            _fail("上面这一步失败，请检查输出；本地改动还在，不会丢失")

    print("\n[OK] 已推送。GitHub Actions 会自动测试并部署：")
    print("   https://github.com/himlaya/xiaoman-garden/actions")
    print("   https://himlaya.github.io/xiaoman-garden/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
