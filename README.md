# ⚡ Quai GPU Miner

**The easiest way to mine Quai Network - Automatic GPU detection, driver installation, and setup**

> One command to get started mining Quai Network with your GPU

## 🚀 Quick Start

### One-Command Setup

```bash
sudo ./setup.sh
```

That's it! This single command will:
- ✅ **Detect your GPU** (NVIDIA or AMD)
- ✅ **Install drivers** automatically
- ✅ **Install quai-gpu-miner** from source
- ✅ **Set up web interface** for easy configuration
- ✅ **Create systemd service** for auto-start

### After Setup

1. **Start the web interface:**
   ```bash
   cd miner-dashboard
   npm start
   ```
   Open `http://localhost:3000` in your browser

2. **Configure your miner:**
   - Enter your wallet address
   - Select a mining pool
   - Click "Start Mining"

3. **Enable auto-start (optional):**
   ```bash
   sudo systemctl enable quai-gpu-miner
   sudo systemctl start quai-gpu-miner
   ```

## 🎮 Supported GPUs

### NVIDIA
- ✅ All NVIDIA GPUs (GTX, RTX series)
- ✅ Automatic driver installation
- ✅ Optimized settings for mining

### AMD
- ✅ All AMD GPUs (RX series, Vega, Navi)
- ✅ Automatic OpenCL driver installation
- ✅ Architecture-specific optimizations

## 📋 Requirements

- **OS**: Linux (Ubuntu 20.04+ or Debian 11+)
- **GPU**: NVIDIA or AMD (ProgPoW compatible)
- **RAM**: 4GB minimum
- **Storage**: 10GB+ free space
- **Internet**: Required for driver downloads

## 🔧 Manual Setup (if needed)

If the automatic setup doesn't work for your system:

### NVIDIA Setup
```bash
# Install drivers
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt-get update
sudo ubuntu-drivers autoinstall
sudo reboot
```

### AMD Setup
```bash
# Install OpenCL drivers
sudo apt-get update
sudo apt-get install -y mesa-opencl-icd opencl-headers ocl-icd-libopencl1 clinfo
```

### Install Miner
```bash
git clone https://github.com/dominant-strategies/quai-gpu-miner.git
cd quai-gpu-miner
mkdir build && cd build
cmake ..
make -j$(nproc)
```

## 📚 Documentation

- [GPU Detection Guide](docs/GPU_DETECTION.md) - How GPU detection works
- [Driver Installation](docs/DRIVERS.md) - Manual driver setup
- [Mining Configuration](docs/MINING_CONFIG.md) - Configure your miner
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🛠️ Troubleshooting

### GPU Not Detected
```bash
# Check if GPU is visible
lspci | grep -i "vga\|3d"

# Check NVIDIA
nvidia-smi

# Check AMD
clinfo
```

### Drivers Not Working
```bash
# Re-run setup
sudo ./setup.sh

# Or manually install drivers
sudo ./quaiminer-os/driver-manager.sh
```

### Miner Won't Start
```bash
# Check logs
sudo journalctl -u quai-gpu-miner -f

# Check miner directly
cd /opt/quai-gpu-miner/build
./ethcoreminer -G
```

## 🌐 Web Interface

The web interface provides:
- **GPU Detection** - See all detected GPUs
- **Driver Status** - Check if drivers are installed
- **Mining Configuration** - Set wallet, pool, and settings
- **Real-time Monitoring** - Hash rate, temperature, shares
- **Easy Controls** - Start/stop mining with one click

Access at: `http://localhost:3000`

## 🤝 Contributing

Contributions welcome! This project aims to make Quai mining as easy as possible.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## ⚠️ Disclaimer

This software modifies system drivers and configurations. Use at your own risk. Always backup your system before running installation scripts.

---

**Quai GPU Miner** - Making Quai Network mining accessible to everyone
