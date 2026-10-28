# 小小花园 · 更新与上线

这份说明解决两个不同的问题：

1. **网页 / PWA 更新**：把新的 `www/` 传到线上；网页客户端会自己检查版本，保存进度后自动刷新。
2. **原生 App 更新**：Android / iOS / HarmonyOS 安装包里的网页是打包进去的，必须重新构建并提交商店。

目前游戏没有后端，所有数据都是本地的，所以网页端可以纯静态托管，不需要买服务器跑 Node。

---

## 一、网页 / PWA 上线

### 自动部署（已启用）

线上地址：**https://himlaya.github.io/xiaoman-garden/**
源码仓库：**https://github.com/himlaya/xiaoman-garden**

仓库中的 GitHub Actions 流水线（`.github/workflows/deploy-pages.yml`）已经配置并成功运行：

1. 每次 push 到 `main` / `master`，先安装依赖并跑 `npm test`；
2. 测试通过后，把 `www/` 原样上传到 GitHub Pages；
3. 网站 HTTPS、免服务器、免运维；
4. 网页客户端会自动检查 `version.json` 并刷新到新版本。

**之后每次发布，只要运行项目根目录的：**

```text
publish.cmd 0.5.2 8
```

或者直接用 Python：

```bash
python tools/publish.py 0.5.2 8
```

它会先根据 `content/garden.py` 生成 `www/js/data.js`，再跑内容测试和 JS 测试、更新版本、同步三端资源、提交并推送。手动执行时等价于：

```bash
python tools/build_content.py
npm test
npm run version:set -- 0.5.2 8
npm run sync:native
git add .
git commit -m "release: v0.3.1 build 4"
git push
```

推送后流水线会自动跑测试并部署。网页 / PWA 用户下次打开或回到页面时，客户端会发现新版本并自动刷新。

> 这台电脑上的 Git / GitHub CLI 是装在 `.tools/` 里的便携版，并且 GitHub 已登录；`publish.cmd` 会自动使用它们。换一台电脑时需要自己安装 Git 和 GitHub CLI 并登录。
>
> 如果代码不能公开，GitHub 免费版 Pages 不适用，可以改用 Cloudflare Pages 或自有服务器。

### 手动部署 / 其他平台

| 场景 | 推荐 | 说明 |
| --- | --- | --- |
| 快速上线 / 海外访问 | GitHub Pages、Cloudflare Pages、Vercel、Netlify | 连接仓库或直接上传 `www/`，自动 HTTPS |
| 国内访问 | 腾讯云 COS + CDN、阿里云 OSS + CDN、华为云 OBS | 需要有备案的域名与国内 CDN |
| 自己已有服务器 | Nginx / Caddy 静态站 | 把 `www/` 作为站点根目录 |

这是一个**内容由 Python 生成、部署仍然是纯静态**的站点：

- 内容源：`content/garden.py`
- 生成命令：`python tools/build_content.py`
- 发布目录：项目里的 `www/`
- 托管端不需要运行 Python，因为 `www/js/data.js` 会随仓库一起发布
- 路由：只有一个 `index.html`，不需要 SPA 重写
- 必须启用 **HTTPS**，否则 PWA 安装和 Service Worker 不生效

### 每次发新版

1. 修改花的数值、任务或文案：

```text
content/garden.py
```

2. 生成前端数据并跑测试（`publish.cmd` 会代做）：

```bash
python tools/build_content.py
npm test
npm run check:ui
```

现在 `npm test` 会跑 **5 个 Python 内容测试 + 8 个 Flask/SQLite 账号/市场测试 + 17 个 JS 规则测试**。想连自动更新流程一起测：

```powershell
$env:CHECK_UPDATE='1'; npm run check:ui
```

3. 发版。推荐直接运行：

```bash
python tools/publish.py 0.5.2 8
```

它会在内部更新版本号并同步资源；如果你要手动控制：

```bash
npm run version:set -- 0.5.2 8
npm run sync:native
```

4. 把 `www/` 目录的新内容上传到托管平台。`version.json` 必须一起上传，客户端靠它判断是否有新版本。

> 不需要把 `android/`、`ios/`、`harmony/` 或 `node_modules/` 上传到网页服务器。网页只需要 `www/`。

### 客户端自动更新机制

网页 / PWA 的更新逻辑在 `www/js/updater.js`：

- 启动 5 秒后检查 `./version.json`；
- 在线前台时每 5 分钟检查一次；
- 从后台切回、恢复网络时也会补检查；
- 远端 `build` 大于当前 `www/js/version.js` 的 `build` 时，先调用 `Game.save()` 保存进度；
- 如果用户正在输入文字、打开签到/植物详情等弹窗，会等当前操作安全结束再刷新；
- 刷新前显示「花园换新中」遮罩，正常情况下 1.3 秒后自动刷新；
- `sessionStorage` 会记录本次构建的更新尝试，防止 CDN 没刷新时反复自动刷新。若更新尝试后仍是旧版本，会显示手动更新条。
- 「我的」页面底部有「检查更新」按钮，可以随时手动检查。

这适用于普通网页和已添加到主屏幕的 PWA。设备离线时检查会静默失败，恢复网络后再次检查。

### 缓存与 PWA 更新

项目使用 Service Worker 缓存掉线页面。新版本上传后：

- 普通网页用户和已安装 PWA：自动更新器会发现新构建，保存进度并自动刷新。
- 如果 CDN 缓存了旧文件，需要**刷新 CDN 缓存**，至少针对：
  - `/index.html`
  - `/sw.js`
  - `/version.json`
  - `/manifest.webmanifest`
  - `/js/*`
  - `/css/*`

建议缓存策略：

```text
index.html          Cache-Control: no-cache
sw.js               Cache-Control: no-cache
version.json        Cache-Control: no-cache, no-store
manifest.webmanifest Cache-Control: no-cache
js / css / icons    Cache-Control: public, max-age=3600, must-revalidate
```

本项目没有文件名 hash 的构建流程，因此更新后最好主动刷新一次 CDN 上以上文件，或者把所有静态文件都设置成短缓存。

`version:set` 会自动把 `www/sw.js` 的 `CACHE_NAME` 改掉（例如 `xiaoman-garden-v0.5.2-8`），这样旧缓存会在新 Service Worker 激活时被清理。

### 如果你想让“发布”也自动化

客户端自动更新解决的是“用户打开页面后如何拿到新版”。如果还想让“代码一提交就自动部署”，需要把项目放进 Git 仓库，再把仓库连接到托管平台：

- Cloudflare Pages / Vercel / Netlify：连接 Git 仓库 → push 到主分支自动部署
- 腾讯云 / 阿里云：可用 CLI + 对象存储上传脚本，接 CI/CD
- 本项目的 `www/` 是静态目录，托管端不需要构建命令；Python 内容生成和 Flask 账号服务都在本地/CI 侧完成。

这一步需要你的 Git 仓库和托管平台账号，配置本身不在代码里。

### 本地账号版（SQLite）

账号功能不在 GitHub Pages 上，因为它需要一个 Python 后端。当前版本在本地运行：

```powershell
start-account.cmd
```

打开 `http://127.0.0.1:8000`，注册后每个账号有独立存档。数据在：

```text
server/data/garden.sqlite3
```

- SQLite 是 Python 自带的，不需要安装 MySQL/PostgreSQL
- 种子和成品花束是唯一物品，品级/模板/品相保存在各自的 `items` 存档里
- 「市场」标签只在账号版出现：挂单后物品进入托管，购买时用 SQLite 事务同时完成买家扣币、卖家收币和物品归属变更
- 当前市场是一口价，只在本机多个账号之间生效；公网交易还需要服务端权威物品发行、HTTPS 和风控
- 账号版会关闭 Service Worker，避免离线缓存串账号
- 要备份就停止 Flask 后复制 `server/data/`
- 若要公开给其他设备使用，需要把 Flask 部署到有 HTTPS 的服务器，并设置反向代理、限流和 `GARDEN_COOKIE_SECURE=1`；不能直接把当前本地服务暴露到公网

### 国内网页上线提醒

如果使用国内域名 + 国内服务器 / CDN，通常先完成 **ICP 备案**，并准备好隐私政策和用户协议。境外托管（如 Cloudflare Pages）不需要国内 ICP，但国内访问速度和稳定性会因线路而异。

---

## 二、原生 App 如何更新

**重点：线上更新 `www/` 不会自动更新已经安装的 Android / iOS / HarmonyOS App。** 三端原生工程都把网页打包进了安装包，所以原生版本需要重新构建、签名和提交商店。网页端的自动更新器无法跨过这个限制。

### Android

1. 执行 `python tools/publish.py 0.5.2 8`（或 `npm run version:set -- 0.5.2 8`）并同步资源。
2. 用 Android Studio 打开 `android/`。
3. 在 `build.gradle` 中版本已更新为 `versionCode 8` / `versionName "0.5.2"`。
4. 生成签名版 **AAB**（Google Play）或 **APK**（国内应用商店 / 直接安装）。
5. 上传到目标商店：

- Google Play：内部测试 / 封闭测试 → 正式发布
- 华为应用市场、小米应用商店、OPPO 软件商店、vivo 应用商店、应用宝等：分别提交 APK，按各商店要求审核

首次签名用的 keystore 必须长期保存，后续同包名更新必须使用同一签名。

### iOS

1. 在 Mac 上执行：

```bash
npx cap sync ios
```

2. 用 Xcode 打开 `ios/App/App.xcworkspace`（不要只开 `.xcodeproj`）。
3. 在 Xcode 中配置 Team、Bundle ID 和签名。
4. 递增版本：`CURRENT_PROJECT_VERSION` 是构建号，`MARKETING_VERSION` 是用户看到的版本号。
5. Xcode → Product → Archive → 上传到 App Store Connect。
6. 先用 **TestFlight** 内测，再提交 App Store 审核。

普通用户不能像网页一样绕开 App Store 更新，因此 iOS 每次更新都要走审核；热更新 JS 包要遵守苹果对动态代码分发的规则，不建议拿它来绕过审核。

### HarmonyOS NEXT

1. 用 DevEco Studio 打开 `harmony/`。
2. 执行 `npm run sync:harmony` 同步最新网页。
3. 在 `AppScope/app.json5` 中版本由 `version:set` 更新。
4. 配置签名，构建签名后的 `.app` / `.hap`。
5. 在 **AppGallery Connect** 创建版本，先做内部测试，再提交审核发布。

如果还需要导出纯血鸿蒙的安装包，必须有华为开发者账号、签名证书和 DevEco Studio；Windows 上只能准备工程，不能替代 Mac 上的 iOS 构建。

---

## 三、内测分发（不上商店）

- **Android**：直接把签名 APK 发给测试人员，或使用 Google Play 内部测试、Firebase App Distribution。
- **iOS**：TestFlight 是最稳的公开测试方式；Ad Hoc 需要收集设备 UDID，不适合大范围分发。
- **HarmonyOS**：AppGallery Connect 内部测试 / 邀请测试。
- **网页**：用 Cloudflare Pages 预览地址、Vercel Preview 或局域网地址。

不要用网页地址来代替原生商店更新：它只能更新网页端，不会更新手机里已安装的 App。

---

## 四、国内上架前需要准备

这些不属于代码，但会影响能否公开下发：

- 各平台开发者账号与实名认证
- 隐私政策、用户协议、权限说明
- 国内 **App 备案**（在境内应用商店上架时通常需要）
- 软件著作权（部分商店 / 游戏类目要求）
- 如果按网络游戏运营，可能还涉及游戏版号等资质，需按发行地区与商店要求核对
- 应用图标、截图、版本说明、测试账号（如后续加入账号系统）

当前游戏没有联网功能，也有助于降低隐私合规和服务器运维压力。

---

## 五、推荐的发布顺序

如果是小步更新，建议：

1. **先发 PWA / 网页**：验证新玩法、数值和 UI。
2. 稳定后执行 `version:set`，同步原生工程。
3. Android 先走内部测试，iOS 走 TestFlight，HarmonyOS 走 AppGallery 内部测试。
4. 三端测试通过后再同时提交正式审核。

这样网页可以每天更新，原生包只在必要的时候发版，不必为了改一朵花的文案就走一次商店审核。
