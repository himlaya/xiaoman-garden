# 公网账号版部署（Render）

GitHub Pages 只能托管 `www/` 静态文件，不能运行 Flask、SQLite、登录会话或市场交易。  
真实市场需要把**整个 Flask 应用**部署到一台公网 Python 主机；Render 是最省事的一种。

部署完成后，GitHub Pages 上会多出一个「在线账号市场」入口，点击后打开 Render 上的完整账号版。

## 一键部署

仓库根目录已经有：

```text
Dockerfile
requirements-deploy.txt
render.yaml
.dockerignore
```

在 Render 里打开：

```text
https://render.com/deploy?repo=https://github.com/himlaya/xiaoman-garden
```

登录 Render、授权 GitHub 仓库，然后按 Blueprint 创建服务。

`render.yaml` 会配置：

- Docker 构建
- 单实例（SQLite）
- 健康检查 `/health`
- 持久化磁盘挂载到 `/var/data`
- `GARDEN_DATA_DIR=/var/data`
- `GARDEN_COOKIE_SECURE=1`
- 新加坡区域

> Render 的免费实例不支持持久化磁盘。市场数据要跨重启保留，必须选择 **Starter 或更高实例**，并保留 1GB 磁盘。
> 免费实例可以用来看界面，但重启/重新部署后 SQLite 可能丢失，不适合真实交易。

## 部署后

Render 会生成一个类似下面的地址：

```text
https://xiaoxiao-garden.onrender.com
```

先打开它，注册账号，确认：

- 登录后底部有「市场」
- 市场可以挂单 / 购买 / 下架
- 3D 收藏品正常
- 刷新后账号存档还在

然后把地址填到：

```text
www/js/runtime-config.js
```

```js
window.XIAOMAN_ONLINE_ACCOUNT_URL = 'https://你的服务.onrender.com';
```

重新发版：

```powershell
python tools/publish.py 0.5.3 9
```

GitHub Pages 的「我的」页面就会出现「在线账号市场」入口。

## 直接用 Docker 跑

本机安装 Docker 后：

```powershell
docker build -t xiaoxiao-garden .
docker run --rm -p 8000:8000 -v xiaoxiao-data:/var/data xiaoxiao-garden
```

打开 `http://127.0.0.1:8000`。

## 重要边界

- 账号和 SQLite 数据库在 Render 的持久化磁盘上，不在 GitHub Pages 上。
- 不能让 GitHub Pages 直接运行这套后端；GitHub Pages 的入口只是链接到 Render。
- 公网部署后任何人都能注册。正式开放前建议加：
  - 注册限流 / 验证码
  - 密码重置
  - HTTPS 自定义域名
  - 备份策略
  - 用户协议与隐私政策
  - 更严格的物品发行和金币服务端校验
- 当前是一口价市场，没有手续费、报价、还价和成交历史。
- 不要在没备份的情况下把 `/var/data` 当成唯一数据源；定期下载数据库文件或使用 Render 的磁盘快照。
