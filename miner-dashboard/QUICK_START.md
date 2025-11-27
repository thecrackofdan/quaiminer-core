# 🚀 Quick Start Guide

**Get your Quai Miner Dashboard running in minutes!**

## 🎯 Choose Your Path

### 🧪 Testing (WSL/Development)
For testing and development on Windows with WSL:
```bash
wsl
cd /path/to/miner-dashboard
bash wsl-setup.sh
npm start
```

### 🏭 Production (Native Linux)
For production deployment on Linux mining rig:
```bash
sudo bash install-production.sh
sudo systemctl start quaiminer-dashboard
```

## 📋 Prerequisites Checklist

- [ ] Linux system (Ubuntu 20.04+, Debian 11+, or compatible)
- [ ] Node.js 18.x (or 14.x minimum)
- [ ] npm installed
- [ ] Quai node running with stratum proxy
- [ ] GPU drivers installed (AMD or NVIDIA)

## ⚡ 5-Minute Setup

### Step 1: Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Get the Code
```bash
git clone https://github.com/thecrackofdan/Quai-GPU-Miner.git
cd quai-gpu-miner/miner-dashboard
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Start Dashboard
```bash
npm start
# Or use the startup script:
./start.sh
```

### Step 5: Access Dashboard
Open browser: `http://localhost:3000`

## 🎛️ Configuration

### Basic Configuration
Edit `public/js/config.js`:

```javascript
api: {
    url: 'http://localhost:8545',  // Your Quai node RPC
    stratum: {
        url: 'stratum://localhost:3333'  // Your node's stratum proxy
    }
}
```

### Environment Variables
Create `.env` file (optional):
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
NODE_RPC_URL=http://localhost:8545
```

## 🔧 Common Commands

```bash
# Start server
npm start

# Development mode
npm run dev

# Run tests
npm test

# Run security tests
npm run test:security

# Check code quality
npm run lint

# Format code
npm run format

# Validate everything
npm run validate
```

## 🏭 Production Deployment

### Automated Installation
```bash
sudo bash install-production.sh
```

### Manual Installation
See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for detailed steps.

### Service Management
```bash
# Start
sudo systemctl start quaiminer-dashboard

# Stop
sudo systemctl stop quaiminer-dashboard

# Restart
sudo systemctl restart quaiminer-dashboard

# Status
sudo systemctl status quaiminer-dashboard

# Logs
sudo journalctl -u quaiminer-dashboard -f
```

## 🌐 Access Points

- **Dashboard**: `http://localhost:3000`
- **API Docs**: `http://localhost:3000/api-docs` (if Swagger installed)
- **Health Check**: `http://localhost:3000/api/health`
- **Metrics**: `http://localhost:3000/api/metrics`

## ✅ Verification

### Check Health
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-12-26T...",
  "uptime": 123.45
}
```

### Check Metrics
```bash
curl http://localhost:3000/api/metrics
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
sudo lsof -ti:3000 | xargs kill -9
```

### Permission Denied
```bash
chmod +x start.sh
chmod +x install-production.sh
```

### Node.js Not Found
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Service Won't Start
```bash
sudo systemctl status quaiminer-dashboard
sudo journalctl -u quaiminer-dashboard -n 50
```

## 📚 Next Steps

1. **Configure Mining**: Set up your stratum proxy and wallet
2. **Monitor Performance**: Check metrics and logs
3. **Optimize GPU**: Use GPU tuner for best performance
4. **Set Up Alerts**: Configure notifications for important events

## 📖 Documentation

- [Production Deployment](PRODUCTION_DEPLOYMENT.md) - Complete production guide
- [WSL Setup](WSL_SETUP.md) - WSL testing guide
- [API Documentation](API_DOCUMENTATION.md) - API reference
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues

## 🆘 Need Help?

- Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- Review [API Documentation](API_DOCUMENTATION.md)
- Check logs: `sudo journalctl -u quaiminer-dashboard -f`

---

**Ready to mine!** ⛏️

