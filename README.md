# Performance MCP

一个基于 stdio 的 MCP 服务，用于查询和保存绩效考核草稿。服务通过绩效系统 API 获取考核周期、考核记录与详情，并且只提供草稿保存能力，不包含最终提交接口。

## 功能

- 查询当前账号可见的绩效考核周期。
- 按周期查询绩效考核记录，支持分页、状态和排序条件。
- 查询单条考核详情，包括任务、评分和评语。
- 保存自评评分、自评总结和“文档和代码”内容为草稿。

## 前置条件

- Node.js 18 或更高版本。
- 可访问的绩效系统地址。
- 有效的登录凭据：短期 Token，或用户名与密码。

## 安装

```powershell
git clone git@github.com:yc-lm/performance-mcp.git
Set-Location performance-mcp
npm install
```

## 环境变量

复制 `.env.example` 的变量名，在运行 MCP 的宿主环境中配置真实值。不要将 `.env`、真实 Token、用户名或密码提交到 Git。

| 变量 | 是否必填 | 说明 |
| --- | --- | --- |
| `PERFORMANCE_BASE_URL` | 是 | 绩效系统服务地址，例如 `https://performance.example.com`。 |
| `PERFORMANCE_TOKEN` | 二选一 | 已登录账号的短期 API Token。 |
| `PERFORMANCE_USERNAME` | 二选一 | 登录账号；仅在未设置 Token 时使用。 |
| `PERFORMANCE_PASSWORD` | 二选一 | 登录密码；仅在未设置 Token 时使用。 |

优先使用短期 Token：

```powershell
$env:PERFORMANCE_BASE_URL = 'https://performance.example.com'
$env:PERFORMANCE_TOKEN = 'your-short-lived-token'
npm start
```

也可以使用用户名和密码：

```powershell
$env:PERFORMANCE_BASE_URL = 'https://performance.example.com'
$env:PERFORMANCE_USERNAME = 'your-username'
$env:PERFORMANCE_PASSWORD = 'your-password'
npm start
```

## 配置 Codex

在 Codex 全局配置文件的 MCP 服务区段中添加以下内容。将路径和环境变量替换为本机实际值；凭据只应保存在本机配置中。

```toml
[mcp_servers.performance-mcp]
command = "node"
args = ['D:\\project\\performance-mcp\\src\\index.js']

[mcp_servers.performance-mcp.env]
PERFORMANCE_BASE_URL = "https://performance.example.com"
PERFORMANCE_TOKEN = "your-short-lived-token"
```

若使用用户名和密码，将上述 Token 配置替换为：

```toml
[mcp_servers.performance-mcp.env]
PERFORMANCE_BASE_URL = "https://performance.example.com"
PERFORMANCE_USERNAME = "your-username"
PERFORMANCE_PASSWORD = "your-password"
```

保存配置后，重启 Codex 或重新加载 MCP 配置使其生效。

## 配置 Claude Code

Claude Code 的全局 MCP 配置通常保存在 `%USERPROFILE%\\.claude.json`。在其中的 `mcpServers` 对象添加或更新 `performance-mcp` 条目。路径与凭据请替换为本机实际值。

```json
{
  "mcpServers": {
    "performance-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "D:\\project\\performance-mcp\\src\\index.js"
      ],
      "env": {
        "PERFORMANCE_BASE_URL": "https://performance.example.com",
        "PERFORMANCE_TOKEN": "your-short-lived-token"
      }
    }
  }
}
```

若使用用户名和密码，将 `PERFORMANCE_TOKEN` 替换为 `PERFORMANCE_USERNAME` 与 `PERFORMANCE_PASSWORD`。完成后重启 Claude Code；在 MCP 服务列表中确认 `performance-mcp` 已连接。

## MCP 工具

### `list_periods`

查询当前登录账号可见的考核周期。通常先调用此工具，再将返回的周期 ID 传给考核记录查询。

### `list_performance_evaluations`

查询绩效考核记录。

| 参数 | 说明 |
| --- | --- |
| `periodId` | 可选，考核周期 ID。 |
| `page` / `limit` | 可选，分页参数；`limit` 最大为 100。 |
| `status` | 可选，按考核状态筛选。 |
| `sortBy` / `sortOrder` | 可选，排序字段和方向。 |

### `get_performance_evaluation_detail`

传入 `evaluationId`，获取任务、各项评分、自评总结、主管评语和“文档和代码”等完整信息。

### `save_performance_draft`

保存一份自评草稿。请求需包含 `evaluationId` 和完整的 `scores` 数组；可选填写 `selfComment` 与 `docAndCode`。

该工具只调用评分草稿接口，不会提交最终考核。保存前应确认：

- 所有评分项均在 0 到 100 之间。
- 自定义任务包含计划天数和完成天数。
- 自评总结和“文档和代码”是字符串。
- 绩效任务、评分和文档证据已由填写人核对。

## 安全说明

- 仓库不包含任何真实账号、密码、Token 或内部服务地址。
- `.env`、`node_modules/` 与 IDE 配置目录已被忽略。
- 不要在 Issue、提交信息、README 或示例中写入真实凭据。
- 推荐使用短期 Token，避免长期保存账号密码。
- 若凭据曾被提交到公开仓库，应立即在服务端失效并重新签发。

## 开发与验证

```powershell
npm test
```

测试覆盖登录 Token 复用、考核查询、草稿保存、参数校验，以及必须显式配置 `PERFORMANCE_BASE_URL` 的行为。

## 项目结构

```text
src/
  index.js                 MCP 服务和工具定义
  performance-client.js    绩效系统 API 客户端
test/
  performance-client.test.js
.env.example               环境变量示例
```
