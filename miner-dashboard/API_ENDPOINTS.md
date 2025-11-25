# QuaiMiner CORE - API Endpoints Documentation

## Authentication Endpoints

### POST /api/auth/login
Login and get JWT token
- **Body**: `{ username, password }`
- **Response**: `{ success, token, user }`

### POST /api/auth/register
Register new user
- **Body**: `{ username, password }`
- **Response**: `{ success, message, apiKey }`

## Mining Statistics

### GET /api/stats
Get current mining statistics
- **Response**: `{ hashRate, shares, earnings, powerUsage, isMining, gpus, network }`

### POST /api/stats/history
Save mining statistics to database
- **Body**: `{ timestamp, hashRate, acceptedShares, rejectedShares, powerUsage, temperature, fanSpeed, gpuId }`
- **Response**: `{ success }`

### GET /api/stats/history
Get historical mining statistics
- **Query**: `hours`, `gpuId`, `aggregated`, `interval`
- **Response**: `{ data }`

## Validated Blocks

### GET /api/blocks/validated
Get validated blocks list
- **Query**: `limit` (default: 100, max: 500)
- **Response**: `{ blocks, total }`

### POST /api/blocks/validated
Add validated block
- **Body**: `{ blockNumber, blockHash, timestamp, chain, reward, txHash }`
- **Response**: `{ success, block }`
- **Rate Limited**: 10 requests per minute

### GET /api/blocks/stats
Get block statistics
- **Response**: `{ total, last24h, last7d, totalReward, lastBlock }`

## Miner Control (QuaiMiner OS)

### GET /api/miner/status
Get miner service status
- **Response**: `{ status, enabled, logs }`

### POST /api/miner/start
Start miner service
- **Response**: `{ success, message }`

### POST /api/miner/stop
Stop miner service
- **Response**: `{ success, message }`

### POST /api/miner/restart
Restart miner service
- **Response**: `{ success, message }`

### GET /api/miner/config
Get miner configuration
- **Response**: `{ success, config }`

### POST /api/miner/config
Update miner configuration
- **Body**: `{ stratum, nodeRpcUrl, wallet, worker, autoStart }`
- **Response**: `{ success, config }`

### GET /api/miner/logs
Get miner logs
- **Query**: `lines` (default: 100)
- **Response**: `{ success, logs }`

## Node RPC

### POST /api/node/rpc
Proxy RPC calls to Quai node
- **Body**: `{ method, params }`
- **Response**: RPC response

## Export

### GET /api/export/pdf
Export data as PDF
- **Query**: `startDate`, `endDate`, `includeCharts`, `includeStats`
- **Response**: PDF file download

### GET /api/export/csv
Export data as CSV
- **Query**: `type` (blocks|stats), `hours`
- **Response**: CSV file download

### GET /api/export/json
Export data as JSON
- **Query**: `type` (blocks|stats), `hours`
- **Response**: JSON file download

## Notifications

### GET /api/notifications
Get unread notifications (requires authentication)
- **Headers**: `Authorization: Bearer <token>` or `X-API-Key: <key>`
- **Response**: `{ notifications }`

### POST /api/notifications/:id/read
Mark notification as read (requires authentication)
- **Headers**: `Authorization: Bearer <token>` or `X-API-Key: <key>`
- **Response**: `{ success }`

## Health Check

### GET /api/health
Health check endpoint
- **Response**: `{ status, timestamp, uptime }`

## Authentication

Most endpoints support optional authentication via:
- **JWT Token**: `Authorization: Bearer <token>`
- **API Key**: `X-API-Key: <key>` or `?apiKey=<key>`

Protected endpoints (require authentication):
- `/api/notifications/*`
- `/api/export/*` (optional, but recommended)

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **Block Submission**: 10 requests per minute per IP

