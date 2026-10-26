# 小满花园 · 原型 v0.1

[![Deploy web game](https://github.com/himlaya/xiaoman-garden/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/himlaya/xiaoman-garden/actions/workflows/deploy-pages.yml)

> 每天收一颗花种，浇一点水，等一朵花慢慢开。

**在线试玩：** https://himlaya.github.io/xiaoman-garden/
**源码仓库：** https://github.com/himlaya/xiaoman-garden

一个手机优先的花草养成小游戏。当前是**可运行的前端原型**：不需要后端、不需要安装依赖就能在电脑浏览器里玩；同一套网页同时提供 PWA，并包含 **Android、iOS、HarmonyOS NEXT** 三套原生工程。

---

## 现在能玩什么

- **每日签到领花**：7 天一轮，每天一颗不同花种，连续第 7 天有铃兰；漏签会重新开始。
- **种花养成**：4 个初始花盆，可扩建到 6 个；选种子、浇水、施肥，植物会分「种子 → 发芽 → 结蕾 → 盛开」四段长大。
- **不同花期**：7 种花有各自的生长时间、盛开时长、种子价格和花束价值。
- **新鲜度采摘**：花开后花期内采摘有最高 1.2 倍新鲜加成；放太久也能采，只是价值会降低。
- **离线生长**：关掉页面后花会按现实时间继续长大，下次回来结算。
- **每日花事**：浇水 2 次领金币、采摘 1 朵领肥料，每天 0 点更新。
- **花市与花房**：用金币买种子 / 肥料 / 新花盆；采摘过的花会收进图鉴。
- **本地存档**：金币、种子、花园、签到和设置都存在本机浏览器里。
- **网页自动更新**：启动后、每 5 分钟和回到前台时自动检查 `version.json`；发现新构建会在安全时机保存进度并刷新，「我的」底部也可以手动检查版本。
- **手机细节**：安全区适配、触控点击、无网络可打开（PWA）、可以“添加到主屏幕”。

游戏里的花期使用**分钟级**时间做原型，方便当场看到花开。想改成真实节奏，只需要调整 `www/js/data.js` 里的 `growSeconds` / `bloomSeconds`。

---

## 在电脑上运行

需要 Node.js 20+（Node 18 也能跑，但推荐 20+）。

```bash
cd D:\xiaoman-garden
npm run dev
```

然后打开：

**http://127.0.0.1:4173**

也可以直接双击项目根目录的 `start-game.cmd`：它会开一个最小化的调试服务器窗口并自动打开浏览器。关闭那个窗口就是停止本地服务器。

> `npm run dev` 使用一个零依赖的小型静态服务器，所以只是为了试玩的话**不需要 `npm install`**。
> 不建议直接双击 `www/index.html`：部分浏览器在 `file://` 下会限制本地存档。

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
4. **浇水**：立刻推进 3.5% 成长，并让花在接下来 90 秒以 1.5 倍速度生长；每 20 秒可浇一次。
5. **施肥**：消耗 1 包肥料，立刻推进 18% 成长。
6. 花开后点「采摘花束」，获得金币和花艺值。花期内越早采摘，新鲜加成越高。
7. 用金币去花市买新的花种、肥料或扩建花盆。

### 花的数值（原型）

| 花 | 稀有度 | 种子 | 生长 | 花期 | 基础花束 |
| --- | --- | ---: | ---: | ---: | ---: |
| 白雏菊 | 常见 | 20 金币 | 2 分钟 | 45 分钟 | 46 金币 |
| 郁金香 | 少见 | 35 金币 | 4 分钟 | 1 小时 | 88 金币 |
| 风信子 | 少见 | 60 金币 | 6 分钟 | 1.5 小时 | 150 金币 |
| 花园玫瑰 | 稀有 | 100 金币 | 8 分钟 | 2 小时 | 252 金币 |
| 向日葵 | 稀有 | 150 金币 | 10 分钟 | 3 小时 | 390 金币 |
| 蓝绣球 | 珍稀 | 240 金币 | 12 分钟 | 4 小时 | 640 金币 |
| 铃兰 | 珍稀 | 380 金币 | 15 分钟 | 6 小时 | 1020 金币 |

数值都集中在 `www/js/data.js`，可以直接改价格、生长秒数、签到奖励、每日任务和花语文案。

### 原型调试

「我的 → 原型调试 · 时光沙漏」可以把生长速度调到 **1× / 60× / 300×**，用来快速验证开花、采摘和离线结算。它只影响当前存档，不会改变花束价值。

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

### 原生构建验证状态

- 三套原生工程与资源已生成，应用 ID、图标、启动图、竖屏方向已统一。
- 本机没有 Android SDK、Xcode（Windows）和 DevEco Studio，所以**还没有实际产出 APK / IPA / HAP**。
- Web/PWA、规则测试、三档浏览器布局与刷新存档恢复已经在本机验证通过；原生工程需要在对应工具链里完成第一次构建和真机回归。

### 下次更新怎么发到网上

版本号、网页部署、PWA 缓存刷新、三端商店发版的完整流程见 **[RELEASE.md](RELEASE.md)**。

仓库里已经配置好 **GitHub Actions → GitHub Pages** 自动部署流水线：`.github/workflows/deploy-pages.yml`。push 到 `main` / `master` 后会自动跑测试，测试通过就把 `www/` 发布上线；网页客户端随后会自动检查并更新。

线上地址：**https://himlaya.github.io/xiaoman-garden/**

之后每次发布，双击项目根目录的 `publish.cmd`，按提示输入新版本号和构建号即可：

```text
publish.cmd 0.2.0 2
```

它会自动更新版本、跑测试、同步三端资源、提交并推送；GitHub Actions 接着完成测试和部署。也可以手动执行：

```bash
npm run version:set -- 0.2.0 2
npm test
npm run sync:native
git add .
git commit -m "release: v0.2.0"
git push
```

它会把网页、Android、iOS、HarmonyOS 的版本号，`www/version.json`、`www/js/version.js` 和 Service Worker 的缓存版本一起更新。原生版本仍需要重新构建安装包。

---

## 项目结构

```
xiaoman-garden/
├─ www/                          # 真正的前端（无构建步骤）
│  ├─ index.html
│  ├─ css/style.css              # 移动优先的整套视觉样式
│  ├─ js/data.js                 # 花卉、签到、任务、价格等数值
│  ├─ js/art.js                  # 手绘感 SVG 花朵与生长阶段
│  ├─ js/game.js                 # 存档、时间推进、签到、种植、商店规则
│  ├─ js/app.js                  # 渲染、弹窗、交互、音效、粒子
│  ├─ js/version.js              # 当前网页版本（自动更新对比用）
│  ├─ js/updater.js              # 版本检查、安全刷新与服务 Worker 更新
│  ├─ version.json               # 线上最新版本清单
│  ├─ icons/                     # PWA / Apple Touch 图标
│  ├─ manifest.webmanifest
│  └─ sw.js                      # 离线缓存
├─ android/                      # Capacitor Android 原生工程
├─ ios/                          # Capacitor Xcode 工程
├─ harmony/                      # HarmonyOS NEXT ArkWeb 工程（含独立 README）
├─ resources/                    # 三端图标、启动图源文件
├─ scripts/serve.js              # 零依赖本地调试服务器
├─ scripts/browser-check.js      # Edge 无头浏览器 UI 流程与自动更新冒烟测试
├─ scripts/sync-harmony.js       # 将 www 同步到鸿蒙 rawfile
├─ scripts/set-version.js        # 一次更新三端与 PWA 版本号
├─ scripts/generate-native-assets.py  # 重新生成三端图标 / 启动图
├─ tests/                        # 13 个规则 / 版本一致性测试
├─ .github/workflows/            # GitHub Pages 自动测试 + 部署
├─ publish.cmd                   # 一键发版：版本、测试、同步、提交、推送
├─ start-game.cmd                # Windows 双击启动试玩
├─ capacitor.config.json         # Android / iOS 原生壳配置
├─ RELEASE.md                    # 上线、缓存刷新和商店发版流程
└─ package.json
```

## 测试

```bash
npm test
```

会跑 13 个测试：签到推进、漏签、种植、冷却、浇水、施肥、开花、花期价值、任务、商店、存档恢复、重置，以及三端 + PWA 的版本一致性。

另有一个真实浏览器的界面流程检查（需要本机安装 Edge，并先启动 `npm run dev`；脚本用到 Node 内置 WebSocket，建议 Node 22+）：

```bash
npm run check:ui
```

它会自动走完「引导 → 签到 → 种花 → 浇水 → 花市 → 花房 → 我的 → 加速开花 → 采摘」，把截图放到 `screenshots/`，并报告页面报错和最终存档状态。

如果想连自动更新流程一起验证（Windows PowerShell）：

```powershell
$env:CHECK_UPDATE='1'; npm run check:ui
```

脚本会模拟一个远端更高构建号，确认更新遮罩出现、页面自动刷新且存档保留。

也可以直接检查线上部署的版本，验证 GitHub Pages 子路径、PWA 和 Service Worker（公网首次加载较慢，要放宽等待时间）：

```powershell
$env:CHECK_URL='https://himlaya.github.io/xiaoman-garden/'
$env:CHECK_SW_TIMEOUT='30000'
$env:CHECK_RELOAD_WAIT='10000'
npm run check:ui
```

## 目前的边界

- 纯本地单机，没有账号、云同步、好友或交易。
- 存档在浏览器 `localStorage`；HarmonyOS 壳会额外备份到原生 Preferences。换设备 / 清应用数据 / 无痕模式仍会丢失。
- 游戏时间读取设备本地时间；手动改系统时间可能影响签到和生长。
- 没有推送通知；花开了要等下次打开页面才看到。
- **网页 / PWA 会自动检查并更新网页版本；已经安装的 Android / iOS / HarmonyOS App 不能静默自更新**，仍然需要重新出包并提交商店。
- 三端原生工程还没有在 Android Studio / Xcode / DevEco Studio 里实际编译过，首次构建时可能需要按工具链提示做少量版本迁移。
- 花期是原型分钟级，正式版建议改成小时级，并补上本地通知、图鉴成就、每日随机订单和装饰系统。

---

如果你接下来想继续做，我建议的下一步是：**改成真实小时级花期 + 本地花开通知 + 每日随机花农订单**。这三样会一下子把“每天回来看看”的循环补完整。
