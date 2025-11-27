# 🚀 Production Linux Deployment Guide

**Complete guide for deploying Quai Miner Dashboard on native Linux production systems**

## 📋 Overview

This guide covers production deployment on **native Linux systems** (not WSL). WSL is for testing only - production miners run on dedicated Linux rigs.

## 🎯 Production Architecture

```
┌─────────────────────────────────────────┐
│     Linux Mining Rig (Production)      │
├─────────────────────────────────────────┤
│  • Ubuntu 20.04+ / Debian 11+          │
│  • Systemd service (auto-start)         │
│  • Dashboard on port 3000              │
│  • GPU miner (quai-gpu-miner)          │
│  • Quai node with stratum proxy         │
└─────────────────────────────────────────┘
```

## 🔧 Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+, Debian 11+, or compatible Linux distribution
- **Node.js**: 18.x LTS (recommended) or 14.x minimum
- **RAM**: 4GB+ recommended
- **Storage**: 20GB+ free space
- **Network**: Internet connection for initial setup

### Software Requirements
- Node.js and npm
- Systemd (standard on modern Linux)
- GPU drivers (AMD or NVIDIA)
- Quai node running with stratum proxy

## 📦 Installation Steps

### 1. Install Node.js (Production)

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x or higher
npm --version
```

### 2. Clone/Deploy Dashboard

```bash
# Option A: Clone from repository
git clone https://github.com/thecrackofdan/Quai-GPU-Miner.git
cd quai-gpu-miner/miner-dashboard

# Option B: Copy files to production location
sudo mkdir -p /opt/quaiminer-dashboard
sudo cp -r miner-dashboard/* /opt/quaiminer-dashboard/
cd /opt/quaiminer-dashboard
```

### 3. Install Dependencies

```bash
# Install production dependencies
npm install --production

# Or install all (including dev dependencies for testing)
npm install
```

### 4. Create Systemd Service

Create `/etc/systemd/system/quaiminer-dashboard.service`:

```ini
[Unit]
Description=Quai Miner Dashboard
After=network.target

[Service]
Type=simple
User=quaiminer
Group=quaiminer
WorkingDirectory=/opt/quaiminer-dashboard
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="HOST=0.0.0.0"
ExecStart=/usr/bin/node /opt/quaiminer-dashboard/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security
NoNewPrivileges=true
PrivateTmp=true

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### 5. Create Service User

```bash
# Create dedicated user for dashboard
sudo useradd -r -s /bin/bash -d /opt/quaiminer-dashboard quaiminer

# Set ownership
sudo chown -R quaiminer:quaiminer /opt/quaiminer-dashboard

# Set permissions
sudo chmod 755 /opt/quaiminer-dashboard
sudo chmod 644 /opt/quaiminer-dashboard/server.js
```

### 6. Configure Environment

Create `/opt/quaiminer-dashboard/.env` (optional):

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
NODE_RPC_URL=http://localhost:8545
MINER_API_URL=http://localhost:8080
```

### 7. Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable quaiminer-dashboard

# Start service
sudo systemctl start quaiminer-dashboard

# Check status
sudo systemctl status quaiminer-dashboard

# View logs
sudo journalctl -u quaiminer-dashboard -f
```

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 3000/tcp  # Dashboard
sudo ufw allow 8545/tcp  # Node RPC (if needed)
sudo ufw allow 3333/tcp  # Stratum proxy
sudo ufw enable
```

### 2. Reverse Proxy (Recommended)

Use Nginx as reverse proxy with SSL:

```nginx
# /etc/nginx/sites-available/quaiminer-dashboard
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

### 3. SSL/TLS (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com
```

### 4. File Permissions

```bash
# Secure sensitive files
sudo chmod 600 /opt/quaiminer-dashboard/.env
sudo chmod 600 /opt/quaiminer-dashboard/data/*.db
sudo chown -R quaiminer:quaiminer /opt/quaiminer-dashboard
```

## 📊 Monitoring & Logging

### 1. Winston Logs

Logs are automatically written to:
- `/opt/quaiminer-dashboard/logs/combined.log` - All logs
- `/opt/quaiminer-dashboard/logs/error.log` - Errors only
- `/opt/quaiminer-dashboard/logs/exceptions.log` - Uncaught exceptions

### 2. Systemd Journal

```bash
# View recent logs
sudo journalctl -u quaiminer-dashboard -n 100

# Follow logs
sudo journalctl -u quaiminer-dashboard -f

# Logs since boot
sudo journalctl -u quaiminer-dashboard -b

# Logs for specific date
sudo journalctl -u quaiminer-dashboard --since "2024-12-26" --until "2024-12-27"
```

### 3. Performance Monitoring

Access metrics endpoint:
```bash
curl http://localhost:3000/api/metrics
```

### 4. Health Checks

```bash
# Health check
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":12345.67}
```

## 🔄 Maintenance

### Update Dashboard

```bash
# Stop service
sudo systemctl stop quaiminer-dashboard

# Backup current version
sudo cp -r /opt/quaiminer-dashboard /opt/quaiminer-dashboard.backup

# Update code
cd /opt/quaiminer-dashboard
git pull  # Or copy new files

# Update dependencies
npm install --production

# Start service
sudo systemctl start quaiminer-dashboard

# Verify
sudo systemctl status quaiminer-dashboard
```

### Restart Service

```bash
# Restart
sudo systemctl restart quaiminer-dashboard

# Reload (if supported)
sudo systemctl reload quaiminer-dashboard
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u quaiminer-dashboard -f

# Last 100 lines
sudo journalctl -u quaiminer-dashboard -n 100

# Errors only
sudo journalctl -u quaiminer-dashboard -p err
```

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status quaiminer-dashboard

# Check logs
sudo journalctl -u quaiminer-dashboard -n 50

# Check if port is in use
sudo lsof -i :3000

# Test manually
cd /opt/quaiminer-dashboard
sudo -u quaiminer node server.js
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R quaiminer:quaiminer /opt/quaiminer-dashboard

# Fix permissions
sudo chmod 755 /opt/quaiminer-dashboard
sudo chmod +x /opt/quaiminer-dashboard/start.sh
```

### Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Database Issues

```bash
# Check database file
ls -lh /opt/quaiminer-dashboard/data/

# Fix permissions
sudo chown quaiminer:quaiminer /opt/quaiminer-dashboard/data/*.db
sudo chmod 644 /opt/quaiminer-dashboard/data/*.db
```

## 📈 Performance Tuning

### 1. Node.js Options

Edit systemd service to add Node.js options:

```ini
ExecStart=/usr/bin/node --max-old-space-size=2048 /opt/quaiminer-dashboard/server.js
```

### 2. PM2 Alternative (Optional)

If you prefer PM2 over systemd:

```bash
# Install PM2
sudo npm install -g pm2

# Start with PM2
pm2 start server.js --name quaiminer-dashboard

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup systemd
```

### 3. Database Optimization

SQLite is already optimized with WAL mode, but you can:

```bash
# Vacuum database periodically
sqlite3 /opt/quaiminer-dashboard/data/quaiminer.db "VACUUM;"
```

## 🔐 Production Checklist

- [ ] Node.js 18.x installed
- [ ] Dashboard deployed to `/opt/quaiminer-dashboard`
- [ ] Service user `quaiminer` created
- [ ] Systemd service configured and enabled
- [ ] Firewall configured (UFW)
- [ ] Reverse proxy configured (Nginx, optional)
- [ ] SSL certificate installed (optional but recommended)
- [ ] Logs directory created and writable
- [ ] Database file permissions set correctly
- [ ] Health check endpoint responding
- [ ] Metrics endpoint accessible
- [ ] Service starts on boot
- [ ] Logs rotating properly
- [ ] Backup strategy in place

## 🎯 Production vs Development

| Feature | Development (WSL) | Production (Linux) |
|---------|------------------|-------------------|
| Node.js | Any version | 18.x LTS |
| Process Manager | Manual/PM2 | Systemd |
| Logging | Console | Winston + Journal |
| Port | 3000 | 3000 (or reverse proxy) |
| User | Your user | Dedicated service user |
| Auto-start | No | Yes (systemd) |
| SSL | No | Yes (recommended) |
| Monitoring | Basic | Full metrics |

## 📚 Additional Resources

- [Systemd Service Guide](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [Nginx Reverse Proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Let's Encrypt SSL](https://letsencrypt.org/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Ready for production!** 🚀

For testing, use WSL. For production mining, use native Linux with this guide.

