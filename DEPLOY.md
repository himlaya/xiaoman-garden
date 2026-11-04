# 免费上线：Render Free + Neon Free

本方案把整个 Flask 游戏放到 Render 免费实例，把账号、密码哈希、花园存档和市场挂单放到 Neon 的 PostgreSQL。部署完成后电脑可以关机，玩家直接用生成的网址登录和交易。GitHub Pages 仍是访客版，可以保留并添加在线版入口。

## 免费范围与等待时间

- Render 的服务实例选 **Free**，不添加磁盘，不创建付费服务。
- Neon 的数据库项目选 **Free**。数据库与游戏实例分开，游戏休眠或重新部署不删除数据库。
- Render 闲置 15 分钟会休眠，之后第一次访问可能等待约一分钟；Neon 也会在闲置后暂停计算并在连接时唤醒。免费不代表永不休眠。
- 免费资源有计算、流量与存储额度。以各平台控制台显示为准，超过额度可能暂停服务；不需要通过升级付费来完成本次部署。
- **不要使用 Render 自带的免费 Postgres**，其免费数据库有 30 天到期限制；本方案使用独立的 Neon。
- 官方说明：[Render 免费服务](https://render.com/docs/free)、[Neon 免费额度](https://neon.com/docs/introduction/plans)。

## 第一步：把修改后的文件更新到 GitHub

不需要安装 ChatGPT GitHub 插件。可在自己的电脑上用 GitHub 网页上传，或用已有 Git 客户端提交。

如果使用提供的更新包，解压后把内容放回原项目根目录，保留相对目录结构，再提交修改。更新包不包含账号数据库和密码。

仓库：https://github.com/himlaya/xiaoman-garden

核心变更：`server/`、`www/js/account.js`、`www/js/app.js`、`www/js/runtime-config.js`、`requirements-deploy.txt`、`render.yaml`，以及说明和测试。原生客户端打包产物需要之后重新同步，本次只部署网页版。

## 第二步：创建 Neon 免费数据库

1. 打开 https://console.neon.tech/ ，注册或登录。
2. 创建项目，例如 `xiaoman-garden`，确认使用 **Free** 计划。
3. 区域尽量靠近 Render 的 Singapore；没有相同区域时选较近的区域即可。
4. 打开 **Connect**，复制 PostgreSQL 连接字符串。使用面向 Python/psycopg 的地址即可，可选择连接池地址。
5. 保留地址里的 `sslmode=require` 和其他安全连接参数。复制的是以 `postgresql://` 开头的地址，不要把外层 `psql '...'` 一起复制。

连接字符串含数据库密码，只填到 Render 的环境变量，不上传 GitHub，不填到前端 JavaScript。

## 第三步：部署 Render 免费游戏服务

推荐从 Blueprint 创建：

https://render.com/deploy?repo=https://github.com/himlaya/xiaoman-garden

1. 登录 Render，允许它读取此仓库；这是 Render 与 GitHub 的关联，不是安装 ChatGPT 插件。
2. 按仓库的 `render.yaml` 创建 Blueprint。
3. 为 **DATABASE_URL** 填入上一步 Neon 的连接字符串。
4. 确认服务实例是 **Free**，没有 Disk 和付费数据库。若页面显示付费，请先停止创建并检查是否已提交新的 `render.yaml`。
5. 创建并等待部署成功。Render 会给出真实的 `https://某个名称.onrender.com` 地址。

模板自动设置：

| 配置 | 值 |
| --- | --- |
| Runtime | Docker |
| Plan | Free |
| DATABASE_URL | 你填写的 Neon 连接字符串 |
| GARDEN_SECRET_KEY | Render 自动生成的固定随机值 |
| GARDEN_COOKIE_SECURE | 1 |
| GARDEN_REQUIRE_CLOUD_DB | 1 |
| Health check | /health |
| Disk | 不添加 |

`GARDEN_REQUIRE_CLOUD_DB=1` 会在漏填云数据库时直接报错停止启动，避免误把存档写进免费实例的临时磁盘。固定 `GARDEN_SECRET_KEY` 让重新部署后登录签名保持一致。

### 若不用 Blueprint，手动创建 Web Service

- Repository：上述 GitHub 仓库。
- Runtime：Docker。
- Instance type：**Free**。
- Dockerfile：`./Dockerfile`。
- 添加上表的 4 个环境变量；手动创建时自行生成并填写固定的 `GARDEN_SECRET_KEY`。
- Health check：`/health`。
- 不添加持久磁盘。不创建 Render Postgres。

## 第四步：验证电脑关机也能玩

1. 手机打开 Render 生成的游戏网址，在网页上注册账号。
2. 用另一个浏览器或另一台设备注册第二个账号。
3. 用第一个账号挂单，第二个账号购买，确认金币与物品更新。
4. 退出并重新登录，确认存档还在。
5. 关闭本机 Python 程序、关闭电脑，再用手机的移动网络访问 Render 地址并登录。
6. 可在 Render 手动重启一次服务，再登录确认账号与存档仍在 Neon。

访问 `/health` 可检查应用进程是否启动，数据库类型应显示 `postgresql`；该接口不会查询数据库，避免健康检查不断唤醒免费数据库。数据库连通性通过注册、登录和读写存档验证。

## 第五步：给原 GitHub Pages 添加入口（可选）

编辑 `www/js/runtime-config.js`：

```js
window.XIAOMAN_ONLINE_ACCOUNT_URL = 'https://Render实际生成的游戏地址.onrender.com';
```

提交后，GitHub Pages 的「我的」页面会出现在线账号市场入口。直接收藏 Render 游戏地址也能使用全部账号功能，不必等待这一步。

## 迁移电脑上已有的测试账号（可选）

云数据库初次部署时是空的，不会自动复制电脑上的 SQLite。若不需要旧测试进度，直接注册新账号即可。

若要保留旧账号、密码和挂单：

1. 停止电脑上的游戏服务，备份整个 `server/data/`。
2. 暂时停止云端玩家操作，准备一个没有账号、存档、挂单的空 Neon 数据库。
3. 在项目根目录安装部署依赖：`python -m pip install -r requirements-deploy.txt`。
4. 在本机终端的 `DATABASE_URL` 环境变量中设置 Neon 的连接字符串。
5. 执行：

```powershell
python tools/migrate_to_postgres.py --sqlite server/data/garden.sqlite3
```

工具只读源 SQLite，保留用户 ID 和密码哈希；整批迁移在一个事务内完成，失败会回滚，目标已有数据时拒绝覆盖。完成后在 Render 使用这个数据库并重新登录，旧登录 Cookie 不必迁移。

## 本地开发与测试

不配置 `DATABASE_URL`，原来的 `python -m server.app` 和 Windows 启动脚本仍使用 SQLite。SQLite 旧存档表会自动添加 `revision` 列。

```text
python -m pip install -r requirements.txt
npm test
```

PostgreSQL 回归测试额外需要部署依赖和独立测试库。设置 `GARDEN_TEST_DATABASE_URL` 后运行：

```text
python -m unittest discover -s tests -p test_server.py -v
```

测试为每一项创建独立 schema 并清理，不覆盖其他 schema。仍请使用独立测试数据库。

## 当前交易边界

已保留一口价市场与事务更新，并增加存档版本检查：旧页面不能覆盖成交后的金币和物品；发生冲突时页面会提示刷新读取最新存档。账号版的首页不缓存。

金币产生和养花仍由游戏客户端计算，适合当前虚拟物品市场测试。若以后做真实货币交易或具有真实价值的资产，需要另行实现服务端权威的金币与物品发行逻辑。
