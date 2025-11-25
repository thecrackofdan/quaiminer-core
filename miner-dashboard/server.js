const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter, authLimiter, blockLimiter } = require('./middleware/rateLimit');
const { blocks, stats, notifications, users } = require('./database');
const { authenticate, optionalAuth, createDefaultUser, hashPassword, verifyPassword, generateToken, generateApiKey } = require('./auth');

// Cross-platform fetch support
// Node.js 18+ has built-in fetch, older versions need node-fetch
let fetch;
try {
    // Try built-in fetch first (Node.js 18+)
    if (typeof globalThis.fetch === 'function') {
        fetch = globalThis.fetch;
    } else {
        // Fallback for older Node.js versions
        fetch = require('node-fetch');
    }
} catch (e) {
    // node-fetch not installed, will use built-in if available
    fetch = globalThis.fetch || null;
    if (!fetch) {
        console.warn('Warning: fetch not available. Install node-fetch for Node.js < 18: npm install node-fetch@2');
    }
}

const app = express();
const PORT = process.env.PORT || 3000;
// Set NODE_ENV from environment or default to production
// On Windows, set it manually: $env:NODE_ENV="development"
const NODE_ENV = process.env.NODE_ENV || 'production';

// Log startup info
if (NODE_ENV === 'development') {
    console.log('========================================');
    console.log('  QuaiMiner CORE Dashboard Server');
    console.log('========================================');
}
console.log(`Server starting on port ${PORT}`);
console.log(`Dashboard: http://localhost:${PORT}`);
if (NODE_ENV === 'development') {
    console.log('Press Ctrl+C to stop');
    console.log('========================================\n');
}

// Configuration
const NODE_RPC_URL = process.env.NODE_RPC_URL || 'http://localhost:8545';
const MINER_API_URL = process.env.MINER_API_URL || null; // e.g., 'http://localhost:4028/api' for Team Red Miner

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for dashboard
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public')));
app.use(apiLimiter); // Apply rate limiting to all routes

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Main mining stats endpoint (for Quai GPU Miner, Team Red Miner, etc.)
app.get('/api/stats', async (req, res) => {
    try {
        // If miner API URL is configured, try to fetch real data
        if (MINER_API_URL && fetch) {
            try {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
                
                const minerResponse = await fetch(MINER_API_URL, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId); // Clear timeout if request completes
                
                if (minerResponse.ok) {
                    const minerData = await minerResponse.json();
                    // Transform miner API response to dashboard format
                    // Adjust based on your miner's API format
                    return res.json({
                        hashRate: minerData.hashrate || minerData.hash_rate || 0,
                        shares: {
                            accepted: minerData.shares?.accepted || minerData.accepted_shares || 0,
                            rejected: minerData.shares?.rejected || minerData.rejected_shares || 0
                        },
                        earnings: minerData.earnings || 0,
                        powerUsage: minerData.power || minerData.power_usage || 0,
                        isMining: minerData.is_mining !== false,
                        gpus: minerData.gpus || minerData.devices || []
                    });
                }
            } catch (minerError) {
                if (minerError.name === 'AbortError') {
                    console.warn('Miner API request timed out, using mock data');
                } else {
                    console.warn('Miner API unavailable, using mock data:', minerError.message);
                }
            }
        }
        
        // Fallback to mock data if miner API is not configured or unavailable
        res.json({
            hashRate: 10.5,
            shares: {
                accepted: 123,
                rejected: 5
            },
            earnings: 0.001234,
            powerUsage: 150,
            isMining: true,
            gpus: [
                {
                    id: 0,
                    name: 'AMD RX 590',
                    hashRate: 10.5,
                    temperature: 72,
                    fanSpeed: 65,
                    powerUsage: 150,
                    memoryTemp: 78
                }
            ],
            network: {
                nodeSynced: true,
                currentChain: 'Prime',
                blockHeight: 1234567,
                difficulty: 1234567890
            }
        });
    } catch (error) {
        console.error('Error in /api/stats:', error);
        res.status(500).json({ error: 'Failed to fetch mining stats', message: error.message });
    }
});

// Quai Node RPC proxy endpoint (for checking node status)
app.post('/api/node/rpc', async (req, res) => {
    try {
        const { method, params = [] } = req.body;
        
        // Validate request
        if (!method || typeof method !== 'string') {
            return res.status(400).json({ 
                error: 'Invalid request',
                message: 'Method is required and must be a string'
            });
        }
        
        // Forward to Quai node RPC
        try {
            if (!fetch) {
                throw new Error('fetch not available. Install node-fetch for Node.js < 18');
            }
            
            // Create AbortController for timeout (fetch doesn't support timeout option directly)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const nodeResponse = await fetch(NODE_RPC_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    jsonrpc: '2.0', 
                    method, 
                    params, 
                    id: Math.floor(Math.random() * 1000000)
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId); // Clear timeout if request completes
            
            if (!nodeResponse.ok) {
                throw new Error(`Node RPC returned ${nodeResponse.status}: ${nodeResponse.statusText}`);
            }
            
            const data = await nodeResponse.json();
            res.json(data);
        } catch (rpcError) {
            // Handle timeout errors specifically
            if (rpcError.name === 'AbortError') {
                console.error('RPC call timed out after 10 seconds');
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Using mock RPC response for development');
                    if (method === 'eth_syncing') {
                        return res.json({ jsonrpc: '2.0', result: false, id: 1 });
                    } else if (method === 'eth_blockNumber') {
                        return res.json({ jsonrpc: '2.0', result: '0x12d687', id: 1 });
                    } else {
                        return res.json({ jsonrpc: '2.0', result: null, id: 1 });
                    }
                }
                return res.status(504).json({ 
                    error: 'Node RPC timeout',
                    message: 'Request timed out after 10 seconds'
                });
            }
            
            console.error('RPC call failed:', rpcError);
            
            // Return mock response for development if node is unavailable
            if (process.env.NODE_ENV === 'development') {
                console.warn('Using mock RPC response for development');
                if (method === 'eth_syncing') {
                    return res.json({ jsonrpc: '2.0', result: false, id: 1 });
                } else if (method === 'eth_blockNumber') {
                    return res.json({ jsonrpc: '2.0', result: '0x12d687', id: 1 });
                } else {
                    return res.json({ jsonrpc: '2.0', result: null, id: 1 });
                }
            }
            
            res.status(503).json({ 
                error: 'Node RPC unavailable',
                message: rpcError.message 
            });
        }
    } catch (error) {
        console.error('Error in /api/node/rpc:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

// Export endpoints
const exportService = require('./export');

app.get('/api/export/pdf', optionalAuth, async (req, res) => {
    try {
        const options = {
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null,
            includeCharts: req.query.includeCharts !== 'false',
            includeStats: req.query.includeStats !== 'false'
        };
        
        const result = await exportService.exportPDF(options);
        res.download(result.filepath, result.filename, (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
                res.status(500).json({ error: 'Failed to send PDF' });
            }
        });
    } catch (error) {
        console.error('Error exporting PDF:', error);
        res.status(500).json({ error: 'Export failed', message: error.message });
    }
});

app.get('/api/export/csv', optionalAuth, async (req, res) => {
    try {
        const options = {
            type: req.query.type || 'blocks',
            hours: parseInt(req.query.hours) || 24
        };
        
        const result = await exportService.exportCSV(options);
        res.download(result.filepath, result.filename, (err) => {
            if (err) {
                console.error('Error sending CSV:', err);
                res.status(500).json({ error: 'Failed to send CSV' });
            }
        });
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ error: 'Export failed', message: error.message });
    }
});

app.get('/api/export/json', optionalAuth, async (req, res) => {
    try {
        const options = {
            type: req.query.type || 'blocks',
            hours: parseInt(req.query.hours) || 24
        };
        
        const result = await exportService.exportJSON(options);
        res.download(result.filepath, result.filename, (err) => {
            if (err) {
                console.error('Error sending JSON:', err);
                res.status(500).json({ error: 'Failed to send JSON' });
            }
        });
    } catch (error) {
        console.error('Error exporting JSON:', error);
        res.status(500).json({ error: 'Export failed', message: error.message });
    }
});

// Miner control endpoints (for QuaiMiner OS integration)
let minerAPI = null;
try {
    minerAPI = require('../quaiminer-os/miner-api.js');
} catch (error) {
    console.warn('QuaiMiner OS API not available:', error.message);
    // Create a mock API for development
    minerAPI = {
        getMinerStatus: async () => ({ status: 'unavailable', error: 'QuaiMiner OS not installed' }),
        startMiner: async () => ({ success: false, error: 'QuaiMiner OS not installed' }),
        stopMiner: async () => ({ success: false, error: 'QuaiMiner OS not installed' }),
        restartMiner: async () => ({ success: false, error: 'QuaiMiner OS not installed' }),
        getConfig: async () => ({ success: false, error: 'QuaiMiner OS not installed' }),
        updateConfig: async () => ({ success: false, error: 'QuaiMiner OS not installed' }),
        getMinerLogs: async () => ({ success: false, error: 'QuaiMiner OS not installed' })
    };
}

app.get('/api/miner/status', async (req, res) => {
    try {
        const status = await minerAPI.getMinerStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting miner status:', error);
        res.status(500).json({ error: 'Failed to get miner status', message: error.message });
    }
});

app.post('/api/miner/start', async (req, res) => {
    try {
        const result = await minerAPI.startMiner();
        res.json(result);
    } catch (error) {
        console.error('Error starting miner:', error);
        res.status(500).json({ error: 'Failed to start miner', message: error.message });
    }
});

app.post('/api/miner/stop', async (req, res) => {
    try {
        const result = await minerAPI.stopMiner();
        res.json(result);
    } catch (error) {
        console.error('Error stopping miner:', error);
        res.status(500).json({ error: 'Failed to stop miner', message: error.message });
    }
});

app.post('/api/miner/restart', async (req, res) => {
    try {
        const result = await minerAPI.restartMiner();
        res.json(result);
    } catch (error) {
        console.error('Error restarting miner:', error);
        res.status(500).json({ error: 'Failed to restart miner', message: error.message });
    }
});

app.get('/api/miner/config', async (req, res) => {
    try {
        const result = await minerAPI.getConfig();
        res.json(result);
    } catch (error) {
        console.error('Error getting miner config:', error);
        res.status(500).json({ error: 'Failed to get miner config', message: error.message });
    }
});

app.post('/api/miner/config', async (req, res) => {
    try {
        const updates = req.body;
        const result = await minerAPI.updateConfig(updates);
        res.json(result);
    } catch (error) {
        console.error('Error updating miner config:', error);
        res.status(500).json({ error: 'Failed to update miner config', message: error.message });
    }
});

app.get('/api/miner/logs', async (req, res) => {
    try {
        const lines = parseInt(req.query.lines) || 100;
        const result = await minerAPI.getMinerLogs(lines);
        res.json(result);
    } catch (error) {
        console.error('Error getting miner logs:', error);
        res.status(500).json({ error: 'Failed to get miner logs', message: error.message });
    }
});

// Initialize default admin user
createDefaultUser().catch(console.error);

// Cleanup old blocks periodically (keep last 1000)
setInterval(() => {
    blocks.deleteOld(1000);
}, 60 * 60 * 1000); // Run every hour

// Authentication endpoints
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const user = users.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);
        users.updateLastLogin(user.id);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ error: 'Login failed', message: error.message });
    }
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        if (users.findByUsername(username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const passwordHash = await hashPassword(password);
        const apiKey = generateApiKey();
        const result = users.create(username, passwordHash, apiKey);

        res.json({
            success: true,
            message: 'User created successfully',
            apiKey: apiKey // Only shown once
        });
    } catch (error) {
        console.error('Error in registration:', error);
        res.status(500).json({ error: 'Registration failed', message: error.message });
    }
});

// Get validated blocks (using database)
app.get('/api/blocks/validated', optionalAuth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const dbBlocks = blocks.getAll(limit);
        res.json({ 
            blocks: dbBlocks,
            total: blocks.getStats().total
        });
    } catch (error) {
        console.error('Error getting validated blocks:', error);
        res.status(500).json({ error: 'Failed to get validated blocks', message: error.message });
    }
});

// Add validated block (called when miner finds a block)
app.post('/api/blocks/validated', blockLimiter, optionalAuth, async (req, res) => {
    try {
        const { blockNumber, blockHash, timestamp, chain, reward, txHash } = req.body;
        
        if (!blockNumber) {
            return res.status(400).json({ error: 'blockNumber is required' });
        }
        
        const blockNum = parseInt(blockNumber);
        if (isNaN(blockNum) || blockNum < 0) {
            return res.status(400).json({ error: 'Invalid blockNumber' });
        }
        
        const block = {
            blockNumber: blockNum,
            blockHash: blockHash || null,
            timestamp: timestamp || Date.now(),
            chain: chain || 'Prime',
            reward: parseFloat(reward) || 0,
            txHash: txHash || null
        };
        
        const result = blocks.add(block);
        
        if (result.success) {
            // Create notification for block find
            if (req.user) {
                notifications.create(
                    req.user.id,
                    'block_found',
                    'Block Found!',
                    `You found block #${blockNum} on ${block.chain} chain with reward ${block.reward} QUAI`
                );
            }
            
            res.json({ success: true, block: { ...block, id: result.id } });
        } else {
            res.json({ success: false, message: result.error });
        }
    } catch (error) {
        console.error('Error adding validated block:', error);
        res.status(500).json({ error: 'Failed to add validated block', message: error.message });
    }
});

// Get block statistics (using database)
app.get('/api/blocks/stats', optionalAuth, async (req, res) => {
    try {
        const blockStats = blocks.getStats();
        const allBlocks = blocks.getAll(1);
        const lastBlock = allBlocks.length > 0 ? allBlocks[0] : null;
        
        res.json({
            ...blockStats,
            lastBlock
        });
    } catch (error) {
        console.error('Error getting block stats:', error);
        res.status(500).json({ error: 'Failed to get block stats', message: error.message });
    }
});

// Historical mining statistics
app.post('/api/stats/history', optionalAuth, async (req, res) => {
    try {
        const stat = req.body;
        stats.add(stat);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving mining stats:', error);
        res.status(500).json({ error: 'Failed to save stats', message: error.message });
    }
});

app.get('/api/stats/history', optionalAuth, async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const gpuId = req.query.gpuId ? parseInt(req.query.gpuId) : null;
        const aggregated = req.query.aggregated === 'true';
        
        if (aggregated) {
            const interval = parseInt(req.query.interval) || 60;
            const data = stats.getAggregated(hours, interval);
            res.json({ data });
        } else {
            const data = stats.getHistory(hours, gpuId);
            res.json({ data });
        }
    } catch (error) {
        console.error('Error getting mining stats history:', error);
        res.status(500).json({ error: 'Failed to get stats', message: error.message });
    }
});

// Notifications endpoints
app.get('/api/notifications', authenticate, async (req, res) => {
    try {
        const unread = notifications.getUnread(req.user.id);
        res.json({ notifications: unread });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ error: 'Failed to get notifications', message: error.message });
    }
});

app.post('/api/notifications/:id/read', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        notifications.markRead(notificationId, req.user.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification', message: error.message });
    }
});

// Serve index.html for all routes (SPA support)
// Serve PWA manifest
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Serve service worker
app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sw.js'), {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

// Serve index.html for all routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    if (NODE_ENV === 'development') {
        console.log(`🚀 QuaiMiner CORE Dashboard running on http://localhost:${PORT}`);
        console.log(`📊 Open your browser and navigate to the URL above`);
        console.log(`🔗 Node RPC: ${NODE_RPC_URL}`);
    } else {
        console.log(`Server running on port ${PORT}`);
    }
    if (MINER_API_URL) {
        console.log(`⛏️  Miner API: ${MINER_API_URL}`);
    } else {
        console.log(`⛏️  Miner API: Not configured (using mock data)`);
    }
});

