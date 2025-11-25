# QuaiMiner CORE - Deployment Guide

## Quick Start

### Docker (Recommended)
```bash
cd miner-dashboard
docker-compose up -d
```

### Manual Installation
```bash
cd miner-dashboard
npm install
npm start
```

## Production Deployment

### 1. Environment Setup

Create `.env` file:
```bash
JWT_SECRET=<generate-random-secret>
ADMIN_PASSWORD=<strong-password>
NODE_RPC_URL=http://localhost:8545
PORT=3000
NODE_ENV=production
```

### 2. Database Setup

Database is automatically created on first run in `data/quaiminer.db`

### 3. Security

- Change default admin password
- Use strong JWT_SECRET
- Enable HTTPS (use reverse proxy)
- Configure firewall
- Set up rate limiting (already configured)

### 4. Reverse Proxy (Nginx Example)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Systemd Service (Linux)

Create `/etc/systemd/system/quaiminer-dashboard.service`:
```ini
[Unit]
Description=QuaiMiner CORE Dashboard
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/miner-dashboard
Environment=NODE_ENV=production
Environment=JWT_SECRET=your-secret
Environment=ADMIN_PASSWORD=your-password
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable quaiminer-dashboard
sudo systemctl start quaiminer-dashboard
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Logs
```bash
# Docker
docker-compose logs -f

# Systemd
journalctl -u quaiminer-dashboard -f
```

## Backup

### Database Backup
```bash
# SQLite database
cp data/quaiminer.db data/quaiminer.db.backup
```

### Automated Backup Script
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
cp data/quaiminer.db "$BACKUP_DIR/quaiminer_$DATE.db"
# Keep only last 30 days
find "$BACKUP_DIR" -name "quaiminer_*.db" -mtime +30 -delete
```

## Updates

### Docker
```bash
docker-compose pull
docker-compose up -d
```

### Manual
```bash
git pull
npm install
npm start
```

## Troubleshooting

See SETUP_GUIDE.md and TESTING_REPORT.md for detailed troubleshooting.

