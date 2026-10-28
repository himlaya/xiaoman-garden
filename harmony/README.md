# 小小花园 · HarmonyOS NEXT 壳

这是小小花园的 HarmonyOS NEXT 原生容器：**ArkTS / ArkUI + ArkWeb**。游戏本体仍然复用 `www/` 里的同一套 HTML/CSS/JS，避免三端各写一遍玩法。

- Bundle ID：`com.xiaoman.garden`
- 目标：HarmonyOS NEXT，API 12+（`5.0.0(12)`）
- 页面：`entry/src/main/ets/pages/Index.ets`
- 本地网页资源：`entry/src/main/resources/rawfile/www/`
- App ID / 应用名：`AppScope/app.json5`

## 用 DevEco Studio 跑起来

1. 安装 **DevEco Studio 5.0 或更新版本**，并安装 HarmonyOS NEXT SDK（API 12 以上）。
2. 在 DevEco Studio 里打开本目录 `harmony/`，不要打开仓库根目录。
3. 等待 `oh-package` 和 hvigor 自动同步；如果提示签名，进入 **File → Project Structure → Signing Configs**，勾选自动生成签名（需要登录华为开发者账号）。
4. 选择 `entry` 模块和一个模拟器/真机，点击 Run。
5. 发布到 AppGallery 时，在 DevEco Studio 里构建签名后的 `.app`，再按华为应用市场要求提交。

> 本工程的配置文件是手工补齐的，当前 Windows 开发机上没有 HarmonyOS SDK / DevEco Studio，所以还**没有经过 HAP 编译验证**。首次打开如果 DevEco 提示升级 hvigor / 模型版本，按提示迁移即可。实际设备上的 WebView 行为也建议再做一次真机检查。

## 同步游戏网页

游戏交互和数值都在仓库根目录的 `www/`。改完网页后，在根目录运行：

```bash
npm run sync:harmony
```

脚本会把 `www/` 完整复制到 `entry/src/main/resources/rawfile/www/`，并同步应用图标。同步后重新运行或构建 HarmonyOS 工程。

当前已经同步了一份，所以直接打开 DevEco 也能先跑。

## 为什么没有直接依赖 localStorage

HarmonyOS 的部分 ArkWeb 本地资源场景下，应用进程结束或升级后可能出现 DOM Storage 被清理的情况。为了不让花园存档丢在系统层，这个壳做了两层保护：

1. **启动注入**：通过 `javaScriptOnDocumentStart`，在网页脚本运行前把 Preferences 中的备份写回 `localStorage`；如果 `localStorage` 里的版本更新，则保留网页里的版本。
2. **定时备份**：页面加载完成后，每 5 秒把 `localStorage` 中的 `xiaoman-garden-save-v1` 写入 HarmonyOS 原生 `Preferences`，以及在页面结束时补一次备份。

游戏内的存档键仍然是：

```text
xiaoman-garden-save-v1
```

这样同一套 `game.js` 在 Android/iOS 用 WebView localStorage，在 HarmonyOS 用“localStorage + Preferences 备份”，不需要分叉游戏逻辑。

## 关于网页自动更新

`www/js/updater.js` 在检测到 `window.__XIAOMAN_HARMONY__` 时会跳过网页版本检查。原因是这个壳读取的是 rawfile 里的本地网页，更新必须随 HAP 一起走 AppGallery / 重新安装，无法只替换网页就更新已安装的鸿蒙应用。

## 已做的系统适配

- 应用 ID 与 Android/iOS 保持一致：`com.xiaoman.garden`
- 浅色状态栏和导航栏，启动窗口背景为奶油色 `#F6F0E3`
- 禁用缩放手势和横屏，保持花园的竖屏构图
- 加载失败时显示重试界面
- 图标和启动图已使用小小花园的品牌资源
- 不申请 INTERNET 权限：当前全部资源都在 rawfile 里离线加载

## 目录

```text
harmony/
├─ AppScope/
│  ├─ app.json5
│  └─ resources/base/
│     ├─ element/string.json
│     └─ media/app_icon.png
├─ entry/
│  ├─ build-profile.json5
│  ├─ hvigorfile.ts
│  ├─ oh-package.json5
│  └─ src/main/
│     ├─ module.json5
│     ├─ ets/entryability/EntryAbility.ets
│     ├─ ets/pages/Index.ets          # ArkWeb + Preferences 存档桥
│     └─ resources/
│        ├─ base/element/
│        ├─ base/media/
│        ├─ base/profile/main_pages.json
│        └─ rawfile/www/                # 由 npm run sync:harmony 生成
├─ hvigor/hvigor-config.json5
├─ build-profile.json5
├─ hvigorfile.ts
└─ oh-package.json5
```
