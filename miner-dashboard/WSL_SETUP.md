# 🐧 WSL (Windows Subsystem for Linux) Setup Guide

## ✅ Detected Environment

- **WSL Version:** 2
- **Distribution:** Ubuntu
- **Status:** Available (currently stopped)

## 🚀 Quick Start in WSL

### 1. Start WSL and Navigate to Project

```bash
# Start WSL Ubuntu
wsl

# Navigate to project (adjust path as needed)
cd /mnt/c/Users/thecr/Downloads/ddbba294-a955-46cc-9496-2a776d459433/New\ folder/miner-dashboard

# Or create a symlink for easier access
# ln -s /mnt/c/Users/thecr/Downloads/ddbba294-a955-46cc-9496-2a776d459433/New\ folder ~/quaiminer
```

### 2. Install Node.js (if not already installed)

```bash
# Update package list
sudo apt update

# Install Node.js 18+ (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install Project Dependencies

```bash
# Install all dependencies
npm install

# This will install:
# - Production dependencies (express, cors, etc.)
# - Development dependencies (eslint, prettier, jest, winston, swagger)
```

### 4. Run Tests (Linux Native)

```bash
# Run all tests
npm test

# Run unit tests with coverage
npm run test:unit

# Run security tests
npm run test:security

# Run in watch mode
npm run test:watch
```

### 5. Start the Server

```bash
# Start development server
npm start

# Or with development mode
npm run dev

# Server will be available at:
# http://localhost:3000 (accessible from Windows browser too!)
```

## 🔧 Linux-Specific Features

### File Permissions

```bash
# Make scripts executable
chmod +x start.sh
chmod +x ../quaiminer-os/*.sh

# Fix log directory permissions
mkdir -p logs
chmod 755 logs
```

### Systemd Service (if running native Linux)

The project includes systemd service files for production deployment:

```bash
# Location: quaiminer-os/quaiminer-watchdog.service
# To use in WSL, you'd need to use WSL systemd (Windows 11+)
```

### GPU Detection (Linux Native)

```bash
# Check for NVIDIA GPU
lspci | grep -i nvidia

# Check for AMD GPU
lspci | grep -i "radeon\|amd"

# Check OpenCL support
clinfo
```

## 🌐 Accessing from Windows

WSL services are automatically accessible from Windows:

- **Dashboard:** `http://localhost:3000`
- **API Docs:** `http://localhost:3000/api-docs`
- **Metrics:** `http://localhost:3000/api/metrics`

## 📁 File System Considerations

### Windows → WSL Path Mapping

- Windows: `C:\Users\thecr\Downloads\...`
- WSL: `/mnt/c/Users/thecr/Downloads/...`

### Performance Tip

For better performance, work directly in WSL filesystem:

```bash
# Copy project to WSL filesystem
cp -r /mnt/c/Users/thecr/Downloads/ddbba294-a955-46cc-9496-2a776d459433/New\ folder ~/quai-gpu-miner
cd ~/quai-gpu-miner/miner-dashboard

# Much faster I/O performance!
```

## 🧪 Testing Linux Features

### Test GPU Detection

```bash
# Run hardware detection script
cd ../quaiminer-os
chmod +x hardware-detector.sh
./hardware-detector.sh
```

### Test Installation Scripts

```bash
# Test installation (dry run)
cd ../quaiminer-os
bash -n install.sh  # Syntax check
```

### Test Bash Scripts

```bash
# Check all shell scripts
find . -name "*.sh" -exec bash -n {} \;
```

## 🔄 Switching Between Windows and WSL

### From Windows PowerShell

```powershell
# Access WSL files
wsl ls ~/quai-gpu-miner/miner-dashboard

# Run commands in WSL
wsl npm test

# Start server in WSL
wsl -d Ubuntu -e bash -c "cd ~/quai-gpu-miner/miner-dashboard && npm start"
```

### From WSL

```bash
# Access Windows files
cd /mnt/c/Users/thecr/Downloads/...

# Run Windows commands (if needed)
cmd.exe /c "echo Hello from Windows"
```

## 🐛 Troubleshooting

### Node.js Not Found

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Permission Denied

```bash
# Fix permissions
chmod +x start.sh
chmod -R 755 .
```

### Port Already in Use

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

### WSL Systemd (Windows 11+)

```bash
# Enable systemd in WSL
sudo nano /etc/wsl.conf
# Add:
# [boot]
# systemd=true

# Restart WSL
wsl --shutdown
```

## 📊 Performance Comparison

| Operation | Windows | WSL (mnt) | WSL (native) |
|-----------|---------|-----------|--------------|
| npm install | Medium | Slow | Fast |
| File I/O | Fast | Slow | Fast |
| Node.js | Fast | Medium | Fast |
| Tests | Fast | Medium | Fast |

**Recommendation:** Work in WSL native filesystem (`~/`) for best performance.

## 🎯 Next Steps

1. **Start WSL:**
   ```bash
   wsl
   ```

2. **Navigate to project:**
   ```bash
   cd /mnt/c/Users/thecr/Downloads/ddbba294-a955-46cc-9496-2a776d459433/New\ folder/miner-dashboard
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Start server:**
   ```bash
   npm start
   ```

## 💡 Pro Tips

- Use VS Code with WSL extension for seamless development
- Keep project in WSL filesystem for better performance
- Use `wsl` command from Windows to quickly access Linux
- WSL services are automatically accessible from Windows browser
- Use `systemd` in WSL (Windows 11+) for production-like services

---

**Ready to develop on Linux!** 🐧

