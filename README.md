# ⚡ QuaiMiner CORE OS

**Complete multi-GPU, multi-rig operating system for solo mining Quai Network**

> ⚠️ **CURRENT STATUS: BETA / TESTING PHASE**  
> **Version 2.1-beta** - This release is currently in testing and has not yet been:
> - Deployed or tested on Linux systems
> - Tested on Quai Network mainnet
> - Tested in production environments
> 
> See [TESTING_STATUS.md](TESTING_STATUS.md) for detailed testing status and requirements.

QuaiMiner CORE OS is a comprehensive mining operating system with tools, scripts, and resources designed specifically for solo mining Quai Network. Built for miners running their own Quai node, it includes:

- 🎮 **Multi-GPU Support** - Automatically detect and manage multiple GPUs (NVIDIA & AMD, including mixed setups)
- 🏭 **Multi-Rig Management** - Monitor and control multiple mining rigs from one dashboard
- 🔍 **Auto-Detection** - Automatic hardware detection, driver installation, and GPU optimization
- 📊 **Real-Time Dashboard** - Web-based monitoring and control interface
- ⚡ **One-Command Setup** - Unified installation script that does everything automatically

Everything you need to mine Quai solo and keep 100% of your rewards.

🌐 **Website:** [View Landing Page](index.html) | 🔗 **GitHub:** https://github.com/thecrackofdan/quaiminer-core-os

## 🚀 Quick Start

### One-Command Installation (Recommended)

```bash
cd quaiminer-os
sudo ./install-unified.sh
```

This single command will:
- ✅ Auto-detect all GPUs (NVIDIA & AMD)
- ✅ Install/update drivers automatically
- ✅ Optimize GPU settings for Quai mining
- ✅ Install and configure quai-gpu-miner
- ✅ Set up multi-GPU mining

### Manual Setup

1. **View the Website:** Open `index.html` in your browser
2. **Launch Dashboard:** Navigate to `miner-dashboard/` and run `npm start`
3. **Setup GPUs:** Run `./quaiminer-os/hardware-detector.sh` to detect hardware
4. **Install Drivers:** Run `./quaiminer-os/driver-manager.sh` for automatic driver installation
5. **Optimize GPUs:** Run `./quaiminer-os/gpu-optimizer.sh` for automatic optimization

### Multi-Rig Setup

```bash
# Register this rig
cd quaiminer-os
sudo ./multi-rig-manager.sh register "Rig-Name" "192.168.1.100"

# List all rigs
sudo ./multi-rig-manager.sh list
```

## 📋 Contents

### 🌐 Website & Dashboard
- **`index.html`** - Landing page and main website for QuaiMiner CORE OS (solo mining focus)
- **`miner-dashboard/`** - Full-featured real-time mining dashboard for solo mining with your own Quai node

### 🔬 Core Research Documents
- **`quai_mining_software_research.md`** - Comprehensive research and comparison of all Quai mining software options
- **`QUAI_MINING_COMMANDS.md`** - Command reference for Quai GPU Miner (official)
- **`mining_software_comparison.sh`** - Interactive tool to get personalized miner recommendations

### ⚙️ Prerequisites (AMD OpenCL Setup)
- **`quick_amd_setup.sh`** - Automated installation script for AMDGPU Pro drivers and OpenCL setup
- **`amd_opencl_setup.sh`** - Diagnostic script for system status checks
- **`ubuntu_20_04_amd_rx590_setup.md`** - Step-by-step AMD OpenCL setup guide (legacy, works on all versions)
- **`UBUNTU_VERSION_SUPPORT.md`** - Ubuntu version compatibility guide
- **`amd_opencl_troubleshooting.md`** - Troubleshooting guide for OpenCL issues

## 🔬 Mining Software Research

### Quick Start

1. **Read the Research**: See [Quai Mining Software Research](quai_mining_software_research.md) for detailed comparison
2. **Get Your Recommendation**: Run `./mining_software_comparison.sh` for personalized suggestion

### Key Findings

**Recommended for Solo Mining with Your Own Node:**

**Quai GPU Miner (Official)**
   - ✅ 0% fees (100% of rewards when built from source)
   - ✅ Quai-specific optimizations
   - ✅ Merged mining support
   - ✅ Official Quai Network miner
   - ✅ Designed for solo mining with your own node
   - ⚠️ Requires building from source

For detailed comparison with other miners, see [Quai Mining Software Research](quai_mining_software_research.md).

### Performance (AMD RX 590)

| Miner | Hashrate | Fees | Setup Difficulty |
|-------|----------|------|-----------------|
| Quai GPU Miner | 10-12 MH/s | 0% | Medium |

## 🚀 Prerequisites Setup

Before choosing and using mining software, you need AMD OpenCL support:

### Automated Setup

```bash
chmod +x quick_amd_setup.sh
./quick_amd_setup.sh
```

This will:
1. Install AMDGPU Pro drivers
2. Configure OpenCL support
3. Set up environment variables
4. Configure user permissions

**Note:** Reboot required after installation.

### Manual Setup

For detailed manual installation or troubleshooting:
- [Ubuntu Version Support](UBUNTU_VERSION_SUPPORT.md) - Compatibility guide for all Ubuntu versions
- [Ubuntu 20.04 Setup Guide](ubuntu_20_04_amd_rx590_setup.md) - Legacy guide (still works on newer versions)
- [Troubleshooting Guide](amd_opencl_troubleshooting.md)

## ✅ Verification

After AMD setup, verify OpenCL is working:

```bash
clinfo
```

You should see your RX 590 detected with OpenCL support.

## 🐧 Ubuntu Version Support

QuaiMiner CORE OS supports **Ubuntu 20.04 LTS, 22.04 LTS, and 24.04 LTS** (latest).

All installation scripts automatically detect your Ubuntu version and install the appropriate drivers:
- **Ubuntu 24.04 LTS** ✅ - Fully supported (uses Mesa drivers or AMDGPU Pro)
- **Ubuntu 22.04 LTS** ✅ - Fully supported (uses Mesa drivers or AMDGPU Pro)
- **Ubuntu 20.04 LTS** ✅ - Fully supported (uses AMDGPU Pro 22.40)

For details, see [Ubuntu Version Support Guide](UBUNTU_VERSION_SUPPORT.md).

## 🎮 Multi-GPU & Multi-Rig

QuaiMiner CORE OS now supports **multiple GPUs** and **multiple rigs** with automatic detection and management.

### Features

- **Multi-GPU Mining**: Automatically detect and mine with all GPUs
- **AMD & NVIDIA Support**: Full support for both vendors, including mixed setups
- **Per-GPU Control**: Start/stop individual GPUs
- **Multi-Rig Management**: Monitor and control multiple rigs from one dashboard
- **Auto-Optimization**: Automatically optimize each GPU for Quai mining
- **Driver Management**: Automatic driver installation and updates for both vendors

### Documentation

- [AMD & NVIDIA Guide](AMD_AND_NVIDIA_GUIDE.md) - Complete guide for both GPU vendors
- [Multi-GPU Setup Guide](MULTI_GPU_SETUP.md) - Complete guide for multi-GPU setups
- [Project Structure](PROJECT_STRUCTURE.md) - Professional file organization

## ⚙️ Environment Variables

For Quai mining, these environment variables are automatically configured:

```bash
export ROC_ENABLE_PRE_VEGA=1
export HSA_OVERRIDE_GFX_VERSION=8.0.0
export GPU_FORCE_64BIT_PTR=1
export GPU_MAX_HEAP_SIZE=100
export GPU_USE_SYNC_OBJECTS=1
```

## 📝 Requirements

- Ubuntu 20.04 (Focal Fossa)
- AMD RX 590 GPU
- Internet connection
- sudo/root access

## 🔧 Troubleshooting

If you encounter issues:

1. Check [Troubleshooting Guide](amd_opencl_troubleshooting.md)
2. Run diagnostic: `./amd_opencl_setup.sh`
3. Verify GPU: `lspci | grep -i amd`
4. Check drivers: `lsmod | grep amdgpu`

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- 🐛 [Report Bugs](https://github.com/thecrackofdan/quaiminer-core-os/issues/new?template=bug_report.md)
- 💡 [Suggest Features](https://github.com/thecrackofdan/quaiminer-core-os/issues/new?template=feature_request.md)
- 📝 [View Issues](https://github.com/thecrackofdan/quaiminer-core-os/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

These scripts modify system drivers and configurations. Use at your own risk. Always backup your system before running installation scripts.

## 🙏 Acknowledgments

- Quai Network community
- AMD GPU mining community
- All contributors to this project
