# QuaiMiner CORE - Mining Dashboard

**Part of QuaiMiner CORE - Production-ready real-time dashboard for monitoring Quai Network mining operations**

🌐 **QuaiMiner CORE:** [Main Repository](https://github.com/thecrackofdan/quaiminer-core) - Complete mining toolkit | 📊 **Dashboard:** [Launch Dashboard](public/index.html)

## Features

- **Real-time Mining Statistics**: Hash rate, shares, temperature monitoring
- **GPU Performance Tracking**: Individual GPU metrics and health monitoring
- **Network Metrics**: Block height, difficulty, network hash rate
- **Solo Mining Support**: Full integration with quai-gpu-miner
- **Coinbase Transaction Tracking**: Fetch and display mining rewards
- **Multi-currency Display**: QUAI, USD, EUR, GBP, BTC, ETH
- **Pelagus Wallet Integration**: Connect and monitor wallet activity
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Prerequisites

- Node.js 14+ and npm
- Linux terminal
- Quai Network node running (for solo mining)

### Installation

1. **Install Node.js** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```

2. **Clone this repository**:
   ```bash
   git clone https://github.com/thecrackofdan/quaiminer-core.git
   cd quaiminer-core/miner-dashboard
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

- **Node RPC URL**: Default `http://localhost:8545`
- **Mining API**: Enable/disable and set URL
- **GPU Configuration**: Add your GPU details
- **Network Settings**: Chain selection, mining mode
- **Update Intervals**: Data refresh rates

### Example Configuration

```javascript
api: {
    enabled: true,
    url: 'http://192.168.2.110:8545',
    updateInterval: 5000
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
    rpcUrl: 'http://localhost:8545',
    enableMetrics: true
}
```

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

- [QuaiMiner CORE](https://github.com/thecrackofdan/quaiminer-core) - Complete mining toolkit with setup scripts, research, and AMD GPU configuration tools

## Support

For issues and questions, check the documentation in the `docs/` directory.
