# 小满花园 · 原型 v0.5

[![Deploy web game](https://github.com/himlaya/xiaoman-garden/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/himlaya/xiaoman-garden/actions/workflows/deploy-pages.yml)

> 每天收一颗花种，浇一点水，等一朵花慢慢开。

**在线试玩：** https://himlaya.github.io/xiaoman-garden/
**源码仓库：** https://github.com/himlaya/xiaoman-garden

一个手机优先的花草养成小游戏。当前是**可运行的前端原型**：不需要后端、不需要安装依赖就能在电脑浏览器里玩；同一套网页同时提供 PWA，并包含 **Android、iOS、HarmonyOS NEXT** 三套原生工程。

花的数值、任务、奖励和文案由 **Python 内容源**维护，再生成前端使用的静态数据；网页、3D 和动画仍由现有前端运行时负责。

## 作者的一句话

- 本软件完全由AI编写，献给我那喜欢种稀奇古怪的植物的女朋友；
- 我知道有大多数人对AI有抵触情绪，但是我的观点是：AI在我还在努力学习Python的过程中实现了我的想法，
- 这是一个非常好的工具。后续我会继续学习，争取能靠自己来开发这个软件，加油！

---

## 现在能玩什么

- **每日签到领花**：7 天一轮，每天一颗不同花种，连续第 7 天有铃兰；漏签会重新开始。
- **种花养成**：4 个初始花盆，可扩建到 6 个；选种子、浇水、施肥，植物会分「种子 → 发芽 → 结蕾 → 盛开」四段长大。
- **不同花期**：7 种花有各自的生长时间、盛开时长、种子价格和花束价值。
- **新鲜度采摘**：花开后花期内采摘有最高 1.2 倍新鲜加成；放太久也能采，只是价值会降低。
- **离线生长**：关掉页面后花会按现实时间继续长大，下次回来结算。
- **每日花事**：浇水 2 次领金币、采摘 1 朵领肥料，每天 0 点更新。
- **花市与花房**：用金币买种子 / 肥料 / 新花盆；采摘过的花会收进图鉴。
- **唯一物品**：每一颗种子和每一束成品花都有独立 ID、品级、模板和品相；这些属性会一直保留，并在 3D 视图里体现。
- **玩家市场**：本地账号版里可以把自己收藏的种子或花束挂单，也可以购买其他账号上架的物品；金币和物品所有权由 Flask/SQLite 事务完成转移。
- **本地存档**：金币、种子、花园、签到和设置都存在本机浏览器里。
- **3D 花房**：在植物详情或已收集的花房卡片里打开，可拖动旋转、双指/滚轮缩放；七种花都有独立的低多边形 3D 模型。
- **网页自动更新**：启动后、每 5 分钟和回到前台时自动检查 `version.json`；发现新构建会在安全时机保存进度并刷新，「我的」底部也可以手动检查版本。
- **手机细节**：安全区适配、触控点击、无网络可打开（PWA）、可以“添加到主屏幕”。

成长和花期按**现实参考周期的五分之一**流动：白雏菊约 19 小时开花，铃兰约 2 天 9 小时。想先看花开，可以用「我的 → 原型调试」里的 3600× 时光沙漏。

---

## 在电脑上运行

需要 Node.js 20+。  
维护花的数值、任务和发版，还需要 Python 3.10+。

```bash
cd D:\xiaoman-garden
npm run dev
```

然后打开：

**http://127.0.0.1:4173**

也可以直接双击项目根目录的 `start-game.cmd`：它会开一个最小化的调试服务器窗口并自动打开浏览器。关闭那个窗口就是停止本地服务器。

> `npm run dev` 使用一个零依赖的小型静态服务器，所以只是为了试玩的话**不需要 `npm install`**。
> 不建议直接双击 `www/index.html`：部分浏览器在 `file://` 下会限制本地存档。

## 本地账号版（SQLite）

账号版和单机版共用同一套网页，额外启动一个 Flask + SQLite 本地服务：

```powershell
start-account.cmd
```

或：

```powershell
python -m pip install -r requirements.txt
python -m server.app
```

打开：

**http://127.0.0.1:8000**

第一次先注册账号。登录后，花园进度按账号保存在：

```text
server/data/garden.sqlite3
```

SQLite 是 Python 自带的嵌入式数据库，**不需要另外安装 MySQL/PostgreSQL**。数据库、密码哈希和登录会话都在本地。

- 换账号：在「我的」页面点「退出」，再登录另一个账号。
- 备份：停止服务后复制 `server/data/`。
- 账号版会在「花市」旁边多出「市场」标签，可挂单和购买其他本地账号的物品。
- GitHub Pages 线上地址仍然是**访客本地存档版**，没有登录后端，因此也没有玩家市场。
- 账号版会关闭 Service Worker，需要联网访问本地 Flask 服务。

详细说明和 API 见 [server/README.md](server/README.md)。

## 唯一物品与玩家市场

采摘、签到或购买种子时，游戏会生成一件独立物品，而不是只给数量加一：

| 字段 | 含义 |
| --- | --- |
| 品级 | 普通、优良、精良、珍藏、传说；影响基础价值和展示颜色 |
| 模板 | 晨曦、暮色、霜纹、金边、月影、焰心、雾蓝、青瓷；决定 3D 花瓣的色调 |
| 品相 | 0.000–1.000 的磨损值，种子的封签状态或花束的初绽、盛放、微倦、风霜、枯荣 |
| 履历 | 培育者、来源、照料评分、采摘新鲜度；种子会把自己的模板传给成品花束 |

3D 花房读取物品保存的模板和品相：同一件物品无论刷新、挂单还是被买走，颜色和磨损都不会变。

挂单时物品会从卖家仓库移入市场托管；购买时 SQLite 事务会同时完成买家扣币、卖家收币和物品归属变更。当前市场是一口价，只在本机多个账号之间生效；公网多人交易还需要把 Flask 服务部署到有 HTTPS 的服务器。

品级权重、模板名称和品相分段集中在：

```text
content/garden.py
```

修改后运行 `python tools/build_content.py` 重新生成前端数据。

### 手机同一局域网预览

```bash
npm run dev -- --host 0.0.0.0
```

让手机和电脑连同一个 Wi-Fi，在手机浏览器打开 `http://电脑的局域网IP:4173`。
HTTPS 不是局域网预览的必需条件；但 iOS 要把网页“添加到主屏幕 / 离线使用”，需要 HTTPS 或本机 localhost。

---

## 玩法说明

1. 第一次进入会有一页简短的引导。
2. 点首页的「今日花种已备好」签到，收下花种和金币。
3. 点空花盆 → 选一颗种子 → 种下。
4. **浇水**：立刻推进 2% 成长，并让花在接下来 2 小时以 1.5 倍速度生长；每 30 分钟可浇一次。
5. **施肥**：消耗 1 包肥料，立刻推进 18% 成长。
6. 花开后点「采摘花束」，获得金币、花艺值和一件带品级 / 模板 / 品相的成品花束；花期内越早采摘，新鲜加成越高，品相也越好。
7. 用金币去花市买新的花种、肥料或扩建花盆。
8. 本地账号版里，在「市场」标签可以上架自己的种子或花束，也可以购买其他账号的收藏品。

### 花的数值（现实参考 1/5 节奏）

| 花 | 稀有度 | 种子 | 生长 | 花期 | 基础花束 |
| --- | --- | ---: | ---: | ---: | ---: |
| 白雏菊 | 常见 | 20 金币 | 19 小时 12 分 | 1 天 | 46 金币 |
| 郁金香 | 少见 | 35 金币 | 1 天 4 小时 48 分 | 1 天 4 小时 48 分 | 88 金币 |
| 风信子 | 少见 | 60 金币 | 1 天 9 小时 36 分 | 1 天 9 小时 36 分 | 150 金币 |
| 花园玫瑰 | 稀有 | 100 金币 | 1 天 14 小时 24 分 | 1 天 14 小时 24 分 | 252 金币 |
| 向日葵 | 稀有 | 150 金币 | 1 天 21 小时 36 分 | 1 天 21 小时 36 分 | 390 金币 |
| 蓝绣球 | 珍稀 | 240 金币 | 2 天 | 2 天 | 640 金币 |
| 铃兰 | 珍稀 | 380 金币 | 2 天 9 小时 36 分 | 2 天 9 小时 36 分 | 1020 金币 |

现实参考周期分别取 4/5、6/6、7/7、8/8、9/9、10/10、12/12 天，再乘以 `TIME_SCALE = 1/5` 得到游戏时间。

### Python 内容源

花的数值、签到奖励、每日任务、价格、文案和调试速度都集中在：

```text
content/garden.py
```

修改后运行下面的命令，会生成前端使用的 `www/js/data.js`：

```bash
python tools/build_content.py
```

`www/js/data.js` 是自动生成文件，不要直接编辑。想加花、改价格或改成长时间，只改 Python 内容源，再运行生成器即可。

发布新版本：

```bash
python tools/publish.py 0.3.1 4
```

它会生成数据、跑测试、升版本、同步三端并推送；完整流程见 [RELEASE.md](RELEASE.md)。

### 原型调试

「我的 → 原型调试 · 时光沙漏」可以把生长速度调到 **1× / 60× / 300× / 3600×**，用来快速验证开花、采摘和离线结算。它只影响当前存档，不会改变花束价值。

---

## Android / iOS / HarmonyOS 三端工程

网页本体只有一份（`www/`），三端原生工程都已经放进仓库：

| 平台 | 原生目录 | 容器 | 应用 ID |
| --- | --- | --- | --- |
| Android | `android/` | Capacitor 7 | `com.xiaoman.garden` |
| iOS | `ios/` | Capacitor 7 | `com.xiaoman.garden` |
| HarmonyOS NEXT | `harmony/` | ArkTS + ArkWeb | `com.xiaoman.garden` |

三端共用的竖屏界面、签到、花期、存档和数值逻辑都在 `www/`。首次准备原生工具前先安装依赖：

```bash
npm install
```

改完网页后同步资源：

```bash
npm run sync:native
```

它会把 `www/` 复制进 HarmonyOS rawfile，并执行 Capacitor 的 Android / iOS copy。也可以单独运行：

```bash
npm run sync:harmony     # 只同步鸿蒙
npm run android:copy     # 只同步安卓
npm run ios:copy         # 只同步 iOS
```

> 如果以后新增了 Capacitor 原生插件，需要执行 `npm run cap:sync` 来更新原生依赖；单纯改网页时用 `sync:native` 就够。

### Android

需要 **Android Studio（Android SDK 35）+ JDK 21**：

```bash
npm run android:open
```

项目位于 `android/`，包名 `com.xiaoman.garden`。首次在 Android Studio 打开时等 Gradle Sync 完成，然后选模拟器或真机运行。已经换上了小满花园的桌面图标与启动图。

### iOS

需要 **macOS + Xcode**。因为 iOS 的 CocoaPods 安装步骤需要在 Mac 上完成，Windows 上生成工程时会跳过 pod install：

```bash
npx cap sync ios        # 在 Mac 上首次打开前执行，安装 Pods 并同步
npm run ios:open
```

项目位于 `ios/App/`，包名 `com.xiaoman.garden`。在 Xcode 里选择 Team 和真机 / 模拟器后运行。AppIcon 和 LaunchScreen 已换成小满花园视觉。

### HarmonyOS NEXT

工程位于 `harmony/`，使用 **ArkTS / ArkUI + ArkWeb**，目标 API 12+：

1. 安装 **DevEco Studio 5.0+** 和 HarmonyOS NEXT SDK。
2. 用 DevEco Studio 打开 `harmony/`（不要打开仓库根目录）。
3. 在 **Project Structure → Signing Configs** 配置自动签名（需要华为开发者账号）。
4. 选择 `entry` 模块，在模拟器或鸿蒙真机上运行。

鸿蒙壳还额外做了 **Preferences 原生存档备份**：启动时在网页脚本前注入上次存档，运行中每 5 秒备份一次，避免某些 ArkWeb 本地页面场景下 DOM Storage 被系统清掉导致花园丢失。详细说明见 [harmony/README.md](harmony/README.md)。

### PWA（三端浏览器都能直接玩）

1. 用 HTTPS 部署 `www/` 目录，或在本机 localhost 调试。
2. Android / HarmonyOS 浏览器：菜单 → **安装应用 / 添加到主屏幕**。
3. iPhone Safari：分享 → **添加到主屏幕**。
4. 项目包含 `manifest.webmanifest`、全套 PNG 图标和 Service Worker，离线可打开最近一次加载过的版本。
5. 新版本部署后，网页会在启动、回到前台或定时检查时发现 `version.json` 里的新构建号，自动保存进度并刷新。用户也可以在「我的」底部手动点「检查更新」。

> 局域网普通 HTTP 页面可以直接玩；iOS 的独立主屏幕体验和 Service Worker 需要 HTTPS。
> 自动更新需要把部署目录里的 `version.json` 一起更新，版本脚本会处理这件事。


