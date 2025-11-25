# QuaiMiner CORE - Setup Guide

## Prerequisites

### Windows Setup
For Windows, `better-sqlite3` requires build tools. Install one of these options:

**Option 1: Install Python (Recommended)**
```powershell
# Install Python 3.x from python.org
# Then install Windows Build Tools
npm install --global windows-build-tools
```

**Option 2: Use Prebuilt Binary**
```powershell
npm install better-sqlite3 --build-from-source=false
```

**Option 3: Use Visual Studio Build Tools**
- Download Visual Studio Build Tools
- Install "Desktop development with C++" workload
- Then run: `npm install`

### Linux/Mac Setup
```bash
# Install dependencies
sudo apt-get install build-essential python3  # Ubuntu/Debian
# or
brew install python3  # macOS

# Then install npm packages
npm install
```

## Installation Steps

1. **Navigate to dashboard directory**
   ```bash
   cd miner-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables** (optional, for production)
   ```bash
   # Windows PowerShell
   $env:JWT_SECRET="your-secret-key-here"
   $env:ADMIN_PASSWORD="your-admin-password"
   $env:NODE_RPC_URL="http://localhost:8545"
   
   # Linux/Mac
   export JWT_SECRET="your-secret-key-here"
   export ADMIN_PASSWORD="your-admin-password"
   export NODE_RPC_URL="http://localhost:8545"
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the dashboard**
   - Open browser to: http://localhost:3000
   - Default admin credentials:
     - Username: `admin`
     - Password: `admin` (or your ADMIN_PASSWORD)

## Docker Deployment (Recommended)

If you have Docker installed:

```bash
cd miner-dashboard
docker-compose up -d
```

The dashboard will be available at http://localhost:3000

## Troubleshooting

### better-sqlite3 Installation Issues

**Windows:**
- Install Python 3.x from python.org
- Install Windows Build Tools: `npm install -g windows-build-tools`
- Or use Visual Studio Build Tools

**Linux:**
- Install build-essential: `sudo apt-get install build-essential python3`

**macOS:**
- Install Xcode Command Line Tools: `xcode-select --install`

### Database Errors

If you see database errors:
- Check that the `data/` directory exists and is writable
- On Linux, ensure proper permissions: `chmod 755 data/`

### Port Already in Use

If port 3000 is in use:
```bash
# Set custom port
$env:PORT=3001  # Windows
export PORT=3001  # Linux/Mac
npm start
```

## First Run

1. Server will create default admin user automatically
2. Database will be initialized on first start
3. Check console for admin credentials and API key
4. **IMPORTANT**: Change default password in production!

## Production Deployment

1. Set strong `JWT_SECRET` environment variable
2. Set secure `ADMIN_PASSWORD`
3. Use HTTPS (reverse proxy with nginx/Apache)
4. Configure firewall rules
5. Set up monitoring and backups
6. Use Docker for easier deployment

