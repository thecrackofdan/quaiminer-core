# Installation Guide - Linux Standalone OS

## Prerequisites

### Required
- **Linux System** (Ubuntu 20.04+ or Debian 11+ recommended)
- **Node.js 14+** (recommended: 18+ LTS)
- **Root/sudo access** for system installation

---

## Installation Steps

### Step 1: Install Node.js

#### Linux (Ubuntu/Debian)
```bash
# Using NodeSource repository (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or using package manager
sudo apt update
sudo apt install nodejs npm
```

#### Linux (Fedora/RHEL/CentOS)
```bash
# Using NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Or using package manager
sudo dnf install nodejs npm
```

#### macOS
```bash
# Using Homebrew (recommended)
brew install node

# Or download installer from https://nodejs.org/
```

### Step 2: Clone or Download Project

```bash
# If using git
git clone <repository-url>
cd miner-dashboard

# Or download and extract ZIP file
# Then navigate to miner-dashboard folder
```

### Step 3: Install Dependencies

```bash
cd miner-dashboard
npm install
```

This installs:
- `express` - Web server framework
- `cors` - Cross-Origin Resource Sharing middleware

### Step 4: Verify Installation

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check installed packages
npm list --depth=0
```

---

## Running the Dashboard

### Method 1: npm Scripts (Recommended)

```bash
npm start
```

This starts the Express server on `http://localhost:3000`

### Method 2: Platform Launchers

**Linux:**
- Run `./start.sh` or `npm start`

**Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

### Method 3: Direct Node.js

```bash
node server.js
```

---

## Troubleshooting Installation

### "node: command not found"

**Linux:**
**Linux:**
- Verify installation: `which node`
- Add to PATH if needed
- Reinstall using package manager: `sudo apt-get install nodejs npm`

### "npm: command not found"

- Node.js installer includes npm
- If missing, reinstall Node.js
- Or install npm separately (not recommended)

### "EACCES" or Permission Errors (Linux/macOS)

**Solution 1: Fix npm permissions**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Solution 2: Use sudo (not recommended)**
```bash
sudo npm install
```

### Port Already in Use

**Change port:**
```bash
# Set environment variable
export PORT=3001
npm start

# Or edit server.js
# Change: const PORT = process.env.PORT || 3001;
```

**Kill process using port:**

Linux/macOS:
```bash
lsof -ti:3000 | xargs kill
```

Linux:
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## System Requirements

### Minimum
- **OS**: Linux (Ubuntu 20.04+ or Debian 11+)
- **RAM**: 100 MB
- **Disk**: 50 MB
- **Node.js**: 14.0.0+
- **Browser**: Modern browser (Chrome, Firefox, Edge, Safari)

### Recommended
- **OS**: Latest stable version
- **RAM**: 256 MB+
- **Disk**: 100 MB+
- **Node.js**: 18+ LTS
- **Browser**: Latest version

---

## Verification Checklist

After installation, verify:

- [ ] Node.js installed: `node --version` shows version
- [ ] npm installed: `npm --version` shows version
- [ ] Dependencies installed: `node_modules` folder exists
- [ ] Server starts: `npm start` runs without errors
- [ ] Browser opens: Dashboard loads at `http://localhost:3000`
- [ ] No console errors: Check browser console (F12)

---

## Next Steps

1. **Configure**: Edit `public/js/config.js` for your setup
2. **Connect Node**: Set RPC URL in config
3. **Connect Wallet**: Install Pelagus extension
4. **Start Mining**: Connect your miner

See [README.md](./README.md) for usage instructions.

---

**Last Updated:** 2024-01-15

