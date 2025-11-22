const express = require('express');
const path = require('path');
const cors = require('cors');

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

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public')));

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

// Data export endpoint
app.get('/api/export', (req, res) => {
    try {
        const format = req.query.format || 'json'; // 'json' or 'csv'
        // This would export current mining data
        // Implementation depends on how you want to store/retrieve data
        res.json({ message: 'Export functionality to be implemented' });
    } catch (error) {
        console.error('Error in /api/export:', error);
        res.status(500).json({ error: 'Export failed', message: error.message });
    }
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

