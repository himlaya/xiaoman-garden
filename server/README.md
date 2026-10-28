# 小小花园 · 本地账号版

这是一个运行在电脑上的 Flask + SQLite 账号服务。它直接复用现有的 `www/` 前端，只额外负责：

- 注册 / 登录 / 退出
- Cookie 登录会话
- 每个账号一份花园存档
- 账号存档自动同步到本地 SQLite
- 玩家市场：种子/花束挂单、托管、购买、下架
- 市场交易使用 SQLite 事务同时更新买卖双方存档

## 启动

双击项目根目录的 **`start-account.cmd`**，或在终端：

```powershell
cd D:\xiaoman-garden
python -m pip install -r requirements.txt
python -m server.app
```

浏览器打开：

```text
http://127.0.0.1:8000
```

第一次进入先注册账号，之后每个账号有独立进度。

## 数据在哪里

```text
server/data/garden.sqlite3    ← 账号、密码哈希、每人的花园存档、市场挂单
server/data/secret_key        ← 登录 Cookie 的签名密钥
```

SQLite 是 Python 自带的嵌入式数据库，不需要安装 MySQL / PostgreSQL，也不需要启动单独的数据库服务。当前 Python 使用 SQLite 3.50.4。

备份时先按 `Ctrl+C` 停止服务，再复制 `server/data/`。这两个文件里包含所有账号和存档，**不要提交到 Git**（已在 `.gitignore` 中忽略）。

## 当前边界

- 这是**本机浏览器**使用的账号系统，默认只监听 `127.0.0.1`。
- 数据跟着账号走，但要在同一台电脑、同一个数据库服务上访问；换电脑需要迁移 `server/data/`。
- GitHub Pages 上仍然是原来的访客本地存档版，没有登录接口。
- 账号模式会关闭 Service Worker，避免离线时拿到错误账号的缓存；需要联网访问本地服务。
- 目前没有找回密码、修改密码、邮箱验证、管理员后台。
- 不要把当前 Flask 服务直接暴露到公网。以后上线需要 HTTPS、反向代理、限流和更完整的安全检查。

## 部署到公网

要把市场开放给其他设备，请把整个 Flask 应用部署到 Render 或其他 Python 主机。GitHub Pages 只能托管静态页面，不能运行本服务。

项目已经包含 Docker/Render 配置，见 [../DEPLOY.md](../DEPLOY.md)。

## 简单测试

```powershell
python -m unittest discover -s tests -p test_server.py -v
```

如果要在自己的代码里调用 API：

- `POST /api/save`：需要登录 Cookie 和 `X-CSRF-Token` 请求头
- `GET /api/save`：读取当前账号存档
- `GET /api/market`：查看在售物品
- `POST /api/market/list`：`{itemId, price}`，把物品移入市场托管
- `POST /api/market/buy`：`{listingId}`，买家扣币、卖家收币并转移物品
- `POST /api/market/cancel`：`{listingId}`，把托管物品退回卖家仓库
- `POST /logout`：需要 `X-CSRF-Token`

## 物品与市场边界

- 种子和成品花束都是唯一物品，`items` 存在各自账号的存档里。
- 挂单时物品会从卖家存档移除，放进 `market_listings` 托管；下架时退回。
- 市场是一口价，没有报价、还价、手续费和历史成交页。
- 客户端存档仍由本地 Flask 信任接收，当前适合本机多账号测试；公网交易前需要把金币和物品发行改成更严格的服务端权威逻辑，并加 HTTPS、限流、风控。
