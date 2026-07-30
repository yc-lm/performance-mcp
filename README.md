# Performance MCP

An MCP stdio server for a performance system.

Tools:

- `list_periods`: query assessment periods.
- `list_performance_evaluations`: query the current user's evaluations.
- `get_performance_evaluation_detail`: query the full content of one evaluation, for example a previous month.
- `save_performance_draft`: save scores, self-comment, and code/document summary through the scores API. It does not submit a final evaluation.

## Configuration

Set `PERFORMANCE_BASE_URL` and either a short-lived API token or a username and password. Credentials stay in the process environment and are never written to this repository.

```powershell
$env:PERFORMANCE_BASE_URL = 'https://performance.example.com'
$env:PERFORMANCE_USERNAME = 'your-username'
$env:PERFORMANCE_PASSWORD = 'your-password'
npm start
```

Alternatively:

```powershell
$env:PERFORMANCE_BASE_URL = 'https://performance.example.com'
$env:PERFORMANCE_TOKEN = 'your-jwt-token'
npm start
```

`PERFORMANCE_BASE_URL` is required.

## Codex Configuration

Register the server as a stdio MCP entry with command `node` and argument `D:\project\performance-mcp\src\index.js`. Configure the three environment variables above in the MCP host environment.

## Development

```powershell
npm test
```
