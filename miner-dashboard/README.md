# Quai GPU Miner - Mining Dashboard

**The easiest way to mine Quai Network - Automatic GPU detection, driver installation, and setup**

🌐 **Quai GPU Miner:** [Main Repository](https://github.com/thecrackofdan/quai-gpu-miner) - Complete mining toolkit | 📊 **Dashboard:** [Launch Dashboard](public/index.html)

## Why It's the Best

**The best-looking, easiest-to-use mining dashboard for Quai Network. Better than HiveOS, better than anything else.**

- **🎨 Beautiful Design**: Modern, intuitive interface that's a joy to use
- **⚡ Easiest Setup**: Get mining in under 5 minutes
- **🏠 Solo Mining**: Mine directly to your own Quai node - 100% of rewards, no fees
- **💎 Quai & Qi Optimized**: Built specifically for Quai Network multi-chain mining
- **🔄 Auto-Optimization**: Automatically switches between chains for maximum profit
- **💰 Merged Mining**: Mine multiple chains simultaneously

## Features

**Everything you need for the best Quai & Qi mining experience**

- **🎨 Beautiful Dashboard**: The most beautiful mining interface you'll ever use
- **⚡ One-Click Mining**: Start mining with a single click
- **🏠 Solo Mining**: Connect your miner to your own Quai node's stratum proxy
- **📊 Real-Time Monitoring**: Hash rate, shares, temperature, power usage
- **💰 Profitability Tracking**: Real-time profit calculations and projections
- **🔧 GPU Management**: Individual GPU metrics and health monitoring
- **📈 Historical Data**: Track performance over time with charts
- **🎯 Auto Chain Switching**: Automatically mines the most profitable chain
- **⚙️ Node Integration**: Connect to your Quai node's RPC for network stats
- **Real-time Mining Statistics**: Hash rate, shares, temperature monitoring
- **GPU Performance Tracking**: Individual GPU metrics and health monitoring
- **Quai & Qi Native**: Auto-switching between chains, merged mining support
- **Multi-currency Display**: QUAI, USD, EUR, GBP, BTC, ETH
- **Pelagus Wallet Integration**: Connect and monitor wallet activity
- **Responsive Design**: Works beautifully on desktop and mobile devices

## Quick Start

### Prerequisites

- Node.js 14+ and npm (18+ recommended)
- Linux terminal (or WSL2 on Windows)
- **Quai Network node running** with stratum proxy enabled (usually port 3333)
- **Your miner** (quai-gpu-miner or compatible) configured to connect to your node's stratum proxy

### 🐧 WSL2 Users (Windows - Testing Only)

**Note:** WSL is for **testing only**. Production miners run on **native Linux systems**.

For WSL testing, see [WSL_SETUP.md](WSL_SETUP.md).

### 🚀 Production Linux Deployment

For production deployment on native Linux systems, see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

Quick production install:
```bash
sudo bash install-production.sh
sudo systemctl start quaiminer-dashboard
```

### Installation

1. **Install Node.js** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```

2. **Clone this repository**:
   ```bash
   git clone https://github.com/thecrackofdan/Quai-GPU-Miner.git
   cd Quai-GPU-Miner/miner-dashboard
   ```

3. **Make the startup script executable**:
   ```bash
   chmod +x start.sh
   ```

4. **Run the dashboard**:
   ```bash
   ./start.sh
   ```

The dashboard will automatically:
- Check for Node.js and npm
- Install dependencies (first time only)
- Start the server on http://localhost:3000
- Open your browser automatically

## Manual Start

```bash
# Install dependencies (first time only)
npm install

# Start server
npm start
```

Then open http://localhost:3000 in your browser.

## Configuration

Edit `public/js/config.js` to configure:

- **Node RPC URL**: Your Quai node's RPC endpoint (default `http://localhost:8545`)
- **Stratum Proxy URL**: Your node's stratum proxy (default `stratum://localhost:3333`)
- **Mining API**: Enable/disable and set URL (if your miner has an API)
- **GPU Configuration**: Add your GPU details
- **Network Settings**: Chain selection, mining mode (solo)
- **Update Intervals**: Data refresh rates

### Example Configuration

```javascript
api: {
    enabled: true,
    url: 'http://192.168.2.110:8545',  // Your Quai node's RPC
    updateInterval: 5000,
    stratum: {
        enabled: true,
        url: 'stratum://192.168.2.110:3333',  // Your node's stratum proxy
        host: '192.168.2.110',
        port: 3333
    }
},
gpus: [
    {
        id: 0,
        name: 'AMD RX 590',
        baseHashRate: 10.5,
        maxTemp: 85,
        targetTemp: 70
    }
],
node: {
    rpcUrl: 'http://localhost:8545',  // Your Quai node's RPC
    enableMetrics: true
},
mining: {
    mode: 'solo'  // Solo mining to your own node
}
```

### Solo Mining Setup

1. **Run Your Quai Node**: Ensure your Quai node is running with stratum proxy enabled
2. **Configure Stratum Proxy**: Set the stratum URL in config.js (usually `stratum://YOUR_NODE_IP:3333`)
3. **Connect Your Miner**: Configure your miner (quai-gpu-miner) to connect to the stratum proxy
4. **Monitor**: Use this dashboard to monitor your solo mining operation

**Benefits of Solo Mining**:
- 100% of block rewards (no pool fees)
- Full control over your mining operation
- Supports network decentralization
- Direct connection to your node

## Server Endpoints

- **Dashboard**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **RPC Proxy**: http://localhost:3000/api/rpc

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
```

### Node.js Not Found

```bash
# Install Node.js
sudo apt install nodejs npm
```

### Permission Denied

```bash
# Make script executable
chmod +x start.sh
```

### Dashboard Not Loading

1. Check browser console (F12) for errors
2. Verify Node.js is running: `node --version`
3. Check server logs in terminal
4. Ensure config.js loads without errors

## Development

Run in development mode with verbose logging:

```bash
NODE_ENV=development npm start
```

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name quai-dashboard
   pm2 save
   pm2 startup
   ```

## License

MIT

## Related Projects

- [Quai GPU Miner](https://github.com/thecrackofdan/quai-gpu-miner) - Complete mining toolkit with setup scripts, research, and AMD GPU configuration tools

## Support

For issues and questions, check the documentation in the `docs/` directory.
