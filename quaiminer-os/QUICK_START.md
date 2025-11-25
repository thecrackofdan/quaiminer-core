# QuaiMiner OS - Quick Start Guide

## 🎯 What is QuaiMiner OS?

QuaiMiner OS is like Hive OS, but built specifically for **solo mining Quai Network with your own node**. It automates everything except driver installation.

**What you need to do:**
1. Install GPU drivers (one-time)
2. Run your own Quai Network node (synced and running)
3. Start your node's stratum proxy
4. Install QuaiMiner OS
5. Point miner at your node's stratum proxy
6. Start mining

**What it does automatically:**
- ✅ Installs quai-gpu-miner
- ✅ Configures environment variables
- ✅ Sets up auto-start on boot
- ✅ Provides web dashboard for control
- ✅ Manages miner process
- ✅ Handles restarts and failures
- ✅ Tracks coinbase rewards from solo mining

## 🚀 Installation (5 minutes)

### Step 1: Install GPU Drivers

**For AMD GPUs:**
```bash
cd ..
./quick_amd_setup.sh
sudo reboot
```

**For NVIDIA GPUs:**
```bash
# Install NVIDIA drivers (varies by distribution)
sudo apt install nvidia-driver-xxx
sudo reboot
```

### Step 2: Install QuaiMiner OS

```bash
cd quaiminer-os
sudo ./install.sh
```

This will:
- Install quai-gpu-miner
- Set up systemd service
- Create configuration files
- Enable auto-start

### Step 3: Start Your Quai Node

**Important:** You must run your own Quai Network node for solo mining!

```bash
# Start your Quai node (this varies by your node setup)
# Example: quai --datadir /path/to/data

# Verify node is synced
# Check node status via RPC or logs

# Start stratum proxy (usually runs on localhost:3333)
# This is typically part of your Quai node setup
```

### Step 4: Configure Stratum Proxy Address

**Option A: Command Line**
```bash
# Set your node's stratum proxy address
sudo quaiminer-config set-stratum stratum://localhost:3333

# Optional: Set wallet address for coinbase rewards
sudo quaiminer-config set-wallet YOUR_WALLET_ADDRESS

# Set node RPC URL (for monitoring)
sudo quaiminer-config set-node-rpc http://localhost:8545

# View configuration
sudo quaiminer-config show
```

**Option B: Web Dashboard** (Recommended)
1. Start dashboard: `cd ../miner-dashboard && npm start`
2. Open: `http://localhost:3000`
3. Go to "Mining Configuration"
4. Enter pool/stratum address
5. Click "Save & Start"

### Step 5: Start Mining

```bash
# Start miner
sudo systemctl start quaiminer

# Check status
sudo systemctl status quaiminer

# View logs
sudo journalctl -u quaiminer -f
```

## 📋 Stratum Proxy Configuration

### Solo Mining with Your Own Node

**Local Node (Recommended):**
```
stratum://localhost:3333
stratum://127.0.0.1:3333
```

**Remote Node (if node is on another machine):**
```
stratum://192.168.1.100:3333
stratum://your-node-ip:3333
```

### Future Depool Support

Depool functionality is coming soon! When available:
```bash
# Enable depool
sudo quaiminer-config enable-depool depool-address 8080
```

**Note:** This system is designed for **solo mining with your own Quai node**. 
For pool mining, you would use standard pool services, but this tool focuses on solo mining.

## 🎮 Using the Web Dashboard

1. **Start Dashboard:**
   ```bash
   cd ../miner-dashboard
   npm start
   ```

2. **Access Dashboard:**
   - Open: `http://localhost:3000`
   - Or from another device: `http://your-rig-ip:3000`

3. **Features:**
   - **Mining Configuration**: Set pool/stratum address
   - **Miner Controls**: Start, stop, restart
   - **Status Monitoring**: Real-time hashrate, temperature
   - **Logs Viewer**: View miner output
   - **Configuration History**: See past settings

## 🔧 Common Commands

```bash
# Check miner status
sudo systemctl status quaiminer

# Start miner
sudo systemctl start quaiminer

# Stop miner
sudo systemctl stop quaiminer

# Restart miner
sudo systemctl restart quaiminer

# View logs
sudo journalctl -u quaiminer -f

# View last 100 log lines
sudo journalctl -u quaiminer -n 100

# Update configuration
sudo quaiminer-config set-stratum stratum://localhost:3333
sudo systemctl restart quaiminer

# Disable auto-start
sudo systemctl disable quaiminer

# Enable auto-start
sudo systemctl enable quaiminer
```

## 🐛 Troubleshooting

### Miner Not Starting

```bash
# Check service status
sudo systemctl status quaiminer

# Check logs for errors
sudo journalctl -u quaiminer -n 50

# Verify configuration
sudo quaiminer-config show

# Check GPU detection
clinfo  # For AMD
nvidia-smi  # For NVIDIA
```

### Pool Connection Issues

```bash
# Test network connectivity
ping your-pool-address

# Check firewall
sudo ufw status

# Verify pool address format
# Should be: stratum://host:port or stratum+tcp://host:port
```

### GPU Not Detected

```bash
# Check GPU
lspci | grep -i "radeon\|nvidia\|amd"

# Check OpenCL (AMD)
clinfo

# Check drivers
lsmod | grep amdgpu  # AMD
lsmod | grep nvidia  # NVIDIA
```

## 📊 Monitoring

### Web Dashboard
- Real-time hashrate
- GPU temperature
- Accepted/rejected shares
- Mining rewards
- Network status

### Command Line
```bash
# Watch logs in real-time
sudo journalctl -u quaiminer -f

# Check GPU stats
watch -n 1 nvidia-smi  # NVIDIA
watch -n 1 rocm-smi    # AMD (if ROCm installed)
```

## 🔄 Auto-Start on Boot

The miner automatically starts on boot if:
1. Service is enabled: `sudo systemctl enable quaiminer`
2. `autoStart` is `true` in config (default: false)
3. Pool/stratum address is configured

To enable auto-start:
```bash
# Enable service
sudo systemctl enable quaiminer

# Set autoStart in config
sudo quaiminer-config set-stratum stratum://localhost:3333
```

## 🌐 Remote Management

Access your mining rig from anywhere:

1. **Set up port forwarding** (optional, for external access)
2. **Access dashboard**: `http://your-rig-ip:3000`
3. **Configure and control** mining remotely

## 📝 Next Steps

1. ✅ Install drivers
2. ✅ Install QuaiMiner OS
3. ✅ Configure pool/stratum
4. ✅ Start mining
5. ✅ Monitor via dashboard

**You're all set!** The miner will run automatically and restart on failures.

For more details, see:
- [Full Documentation](README.md)
- [Installation Guide](INSTALL.md)
- [Configuration Guide](CONFIG.md)

