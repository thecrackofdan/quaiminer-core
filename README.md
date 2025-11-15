# Quai AMD Setup - RX 590 OpenCL for Ubuntu 20.04

This repository contains scripts and documentation for setting up OpenCL support on Ubuntu 20.04 with an AMD RX 590 GPU, optimized for cryptocurrency mining (specifically Quai mining).

## 🔗 Repository

**GitHub:** https://github.com/thecrackofdan/quai-amd-setup

## 📋 Contents

- **`quick_amd_setup.sh`** - Automated installation script that installs AMDGPU Pro drivers, configures permissions, and sets up environment variables
- **`amd_opencl_setup.sh`** - Diagnostic script that checks system status and provides manual installation commands
- **`ubuntu_20_04_amd_rx590_setup.md`** - Comprehensive step-by-step setup guide
- **`amd_opencl_troubleshooting.md`** - Troubleshooting guide for common OpenCL issues

## 🚀 Quick Start

### Automated Installation

Run the automated setup script:

```bash
chmod +x quick_amd_setup.sh
./quick_amd_setup.sh
```

This script will:
1. Update system packages
2. Install required dependencies
3. Download and install AMDGPU Pro drivers
4. Configure user permissions
5. Set up environment variables for mining
6. Create a verification script

**Note:** You will need to reboot after installation for changes to take effect.

### Manual Installation

For manual installation or troubleshooting, see the detailed guides:
- [Ubuntu 20.04 Setup Guide](ubuntu_20_04_amd_rx590_setup.md)
- [Troubleshooting Guide](amd_opencl_troubleshooting.md)

## ✅ Verification

After installation and reboot, verify your setup:

```bash
# Run the verification script created by quick_amd_setup.sh
~/verify_amd_setup.sh

# Or manually check OpenCL
clinfo
```

You should see output indicating your RX 590 is detected and OpenCL is working.

## ⚙️ Environment Variables

For Quai mining, the following environment variables are automatically added to your `~/.bashrc`:

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
- Internet connection for downloading drivers
- sudo/root access

## 🔧 Troubleshooting

If you encounter issues:

1. Check the [Troubleshooting Guide](amd_opencl_troubleshooting.md)
2. Run the diagnostic script: `./amd_opencl_setup.sh`
3. Verify GPU detection: `lspci | grep -i amd`
4. Check driver status: `lsmod | grep amdgpu`

## 📄 License

This repository is provided as-is for educational and setup purposes.

## ⚠️ Disclaimer

These scripts modify system drivers and configurations. Use at your own risk. Always backup your system before running installation scripts.

