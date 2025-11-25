// QuaiMiner OS - Miner Control API
// Provides endpoints for controlling the miner service

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = '/etc/quaiminer/config.json';
const SERVICE_NAME = 'quaiminer';

// Helper: Execute shell command
function execCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error: error.message, stderr });
            } else {
                resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
            }
        });
    });
}

// Helper: Read configuration
async function readConfig() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        throw new Error(`Failed to read config: ${error.message}`);
    }
}

// Helper: Write configuration
async function writeConfig(config) {
    try {
        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        throw new Error(`Failed to write config: ${error.message}`);
    }
}

// Helper: Check if node is synced (for solo mining)
async function checkNodeSynced(rpcUrl) {
    try {
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Try to check node sync status via RPC using curl
        const checkCmd = `curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' ${rpcUrl}`;
        const { stdout } = await execAsync(checkCmd);
        const result = JSON.parse(stdout);
        
        // If result is false, node is synced
        return result.result === false;
    } catch (error) {
        // If we can't check, assume synced (don't block mining)
        console.warn('Could not verify node sync status:', error.message);
        return true;
    }
}

// Get miner status
async function getMinerStatus() {
    try {
        const { stdout } = await execCommand(`systemctl is-active ${SERVICE_NAME}`);
        const isActive = stdout === 'active';
        
        const { stdout: enabled } = await execCommand(`systemctl is-enabled ${SERVICE_NAME}`);
        const isEnabled = enabled === 'enabled';
        
        // Get recent logs
        let logs = '';
        try {
            const { stdout: logOutput } = await execCommand(`journalctl -u ${SERVICE_NAME} -n 50 --no-pager`);
            logs = logOutput;
        } catch (e) {
            logs = 'No logs available';
        }
        
        return {
            status: isActive ? 'running' : 'stopped',
            enabled: isEnabled,
            logs: logs.split('\n').slice(-20).join('\n') // Last 20 lines
        };
    } catch (error) {
        return {
            status: 'error',
            error: error.message
        };
    }
}

// Start miner
async function startMiner() {
    try {
        await execCommand(`sudo systemctl start ${SERVICE_NAME}`);
        return { success: true, message: 'Miner started' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Stop miner
async function stopMiner() {
    try {
        await execCommand(`sudo systemctl stop ${SERVICE_NAME}`);
        return { success: true, message: 'Miner stopped' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Restart miner
async function restartMiner() {
    try {
        await execCommand(`sudo systemctl restart ${SERVICE_NAME}`);
        return { success: true, message: 'Miner restarted' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get configuration
async function getConfig() {
    try {
        const config = await readConfig();
        return { success: true, config };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update configuration
async function updateConfig(updates) {
    try {
        const config = await readConfig();
        
        // Update nested properties
        if (updates.stratum !== undefined) {
            config.miner.stratum = updates.stratum;
        }
        if (updates.wallet !== undefined) {
            config.miner.wallet = updates.wallet;
        }
        if (updates.worker !== undefined) {
            config.miner.worker = updates.worker;
        }
        if (updates.nodeRpcUrl !== undefined) {
            config.node.rpcUrl = updates.nodeRpcUrl;
        }
        if (updates.autoStart !== undefined) {
            config.autoStart = updates.autoStart;
        }
        
        // Depool configuration (future feature)
        if (updates.depoolEnabled !== undefined) {
            config.depool.enabled = updates.depoolEnabled;
        }
        if (updates.depoolAddress !== undefined) {
            config.depool.address = updates.depoolAddress;
        }
        if (updates.depoolPort !== undefined) {
            config.depool.port = updates.depoolPort;
        }
        
        // For solo mining, verify node is synced if required
        if (config.node.requireSynced && config.node.rpcUrl) {
            const isSynced = await checkNodeSynced(config.node.rpcUrl);
            if (!isSynced) {
                return { 
                    success: false, 
                    error: 'Node is not synced. Please wait for sync before starting miner.' 
                };
            }
        }
        
        await writeConfig(config);
        
        // Restart miner if it's running and config changed
        const { stdout } = await execCommand(`systemctl is-active ${SERVICE_NAME}`);
        if (stdout === 'active') {
            await execCommand(`sudo systemctl restart ${SERVICE_NAME}`);
        }
        
        return { success: true, config };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get miner logs
async function getMinerLogs(lines = 100) {
    try {
        const { stdout } = await execCommand(`journalctl -u ${SERVICE_NAME} -n ${lines} --no-pager`);
        return { success: true, logs: stdout };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    getMinerStatus,
    startMiner,
    stopMiner,
    restartMiner,
    getConfig,
    updateConfig,
    getMinerLogs
};

