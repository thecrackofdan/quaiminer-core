// QuaiMiner CORE - Multi-GPU Miner API
// Handles multiple GPUs and rigs for Quai mining

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const CONFIG_DIR = '/etc/quaiminer';
const INSTALL_DIR = '/opt/quaiminer';
const HARDWARE_INFO = path.join(CONFIG_DIR, 'hardware-info.json');
const MINER_CONFIG = path.join(CONFIG_DIR, 'config.json');
const LOG_DIR = '/var/log/quaiminer';

class MultiGPUMinerAPI {
    constructor() {
        this.minerProcesses = new Map(); // Map of GPU index to process
        this.gpuInfo = [];
        this.config = {};
        this.loadConfig();
        this.loadHardwareInfo();
    }

    async loadConfig() {
        try {
            const data = await fs.readFile(MINER_CONFIG, 'utf8');
            this.config = JSON.parse(data);
        } catch (error) {
            console.warn('Config not found, using defaults');
            this.config = {
                stratum_url: 'stratum://localhost:3333',
                node_rpc: 'http://localhost:8545',
                wallet: '',
                worker: 'rig1',
                auto_start: false
            };
        }
    }

    async loadHardwareInfo() {
        try {
            const data = await fs.readFile(HARDWARE_INFO, 'utf8');
            const hardware = JSON.parse(data);
            this.gpuInfo = hardware.gpus || [];
        } catch (error) {
            console.warn('Hardware info not found');
            this.gpuInfo = [];
        }
    }

    async getGPUs() {
        await this.loadHardwareInfo();
        return this.gpuInfo.map((gpu, index) => ({
            index: index,
            vendor: gpu.vendor,
            model: gpu.model,
            architecture: gpu.architecture || 'unknown',
            memory_mb: gpu.memory_mb || 0,
            temperature: gpu.temperature || 0,
            power_watts: gpu.power_watts || 0,
            opencl_available: gpu.opencl_available || false,
            optimized: gpu.optimized || false
        }));
    }

    async getMinerStatus() {
        const gpus = await this.getGPUs();
        const runningGPUs = Array.from(this.minerProcesses.keys());
        
        return {
            status: runningGPUs.length > 0 ? 'running' : 'stopped',
            gpu_count: gpus.length,
            running_gpus: runningGPUs.length,
            gpus: gpus.map((gpu, index) => ({
                ...gpu,
                mining: runningGPUs.includes(index)
            })),
            total_hash_rate: 0, // Would calculate from all GPUs
            total_power: gpus.reduce((sum, gpu) => sum + (gpu.power_watts || 0), 0)
        };
    }

    async startMiner(gpuIndices = null) {
        await this.loadConfig();
        await this.loadHardwareInfo();

        // If no GPUs specified, use all available
        if (!gpuIndices) {
            gpuIndices = this.gpuInfo.map((_, i) => i);
        }

        const minerPath = path.join(INSTALL_DIR, 'quai-gpu-miner', 'build', 'ethcoreminer');
        
        // Check if miner exists
        try {
            await fs.access(minerPath);
        } catch (error) {
            return {
                success: false,
                error: `Miner not found at ${minerPath}. Run installation first.`
            };
        }

        const startedGPUs = [];

        for (const gpuIndex of gpuIndices) {
            if (this.minerProcesses.has(gpuIndex)) {
                console.log(`GPU ${gpuIndex} already mining`);
                continue;
            }

            const gpu = this.gpuInfo[gpuIndex];
            if (!gpu) {
                console.warn(`GPU ${gpuIndex} not found`);
                continue;
            }

            // Build miner command with GPU-specific settings
            const args = [
                '--stratum', this.config.stratum_url,
                '--rpc', this.config.node_rpc,
                '--opencl-device', gpuIndex.toString()
            ];

            if (this.config.wallet) {
                args.push('--coinbase', this.config.wallet);
            }

            if (this.config.worker) {
                args.push('--worker', `${this.config.worker}-gpu${gpuIndex}`);
            }

            // Set environment variables for GPU
            const env = {
                ...process.env,
                GPU_DEVICE_ORDINAL: gpuIndex.toString()
            };

            // AMD-specific environment variables
            if (gpu.vendor === 'amd') {
                if (gpu.architecture === 'polaris20' || gpu.architecture === 'polaris') {
                    env.ROC_ENABLE_PRE_VEGA = '1';
                    env.HSA_OVERRIDE_GFX_VERSION = '8.0.0';
                    env.GPU_FORCE_64BIT_PTR = '1';
                    env.GPU_MAX_HEAP_SIZE = '100';
                    env.GPU_USE_SYNC_OBJECTS = '1';
                }
            }

            // Start miner process for this GPU
            const logFile = path.join(LOG_DIR, `miner-gpu${gpuIndex}.log`);
            const logStream = require('fs').createWriteStream(logFile, { flags: 'a' });

            const minerProcess = spawn(minerPath, args, {
                env: env,
                stdio: ['ignore', logStream, logStream],
                detached: false
            });

            minerProcess.on('error', (error) => {
                console.error(`GPU ${gpuIndex} miner error:`, error);
                this.minerProcesses.delete(gpuIndex);
            });

            minerProcess.on('exit', (code) => {
                console.log(`GPU ${gpuIndex} miner exited with code ${code}`);
                this.minerProcesses.delete(gpuIndex);
            });

            this.minerProcesses.set(gpuIndex, minerProcess);
            startedGPUs.push(gpuIndex);

            console.log(`Started miner for GPU ${gpuIndex} (${gpu.vendor} ${gpu.model})`);
        }

        return {
            success: true,
            started_gpus: startedGPUs,
            message: `Started mining on ${startedGPUs.length} GPU(s)`
        };
    }

    async stopMiner(gpuIndex = null) {
        if (gpuIndex !== null) {
            // Stop specific GPU
            const process = this.minerProcesses.get(gpuIndex);
            if (process) {
                process.kill('SIGTERM');
                this.minerProcesses.delete(gpuIndex);
                return { success: true, message: `Stopped GPU ${gpuIndex}` };
            }
            return { success: false, error: `GPU ${gpuIndex} not running` };
        } else {
            // Stop all GPUs
            const stoppedGPUs = [];
            for (const [gpuIndex, process] of this.minerProcesses.entries()) {
                process.kill('SIGTERM');
                stoppedGPUs.push(gpuIndex);
            }
            this.minerProcesses.clear();
            return {
                success: true,
                stopped_gpus: stoppedGPUs,
                message: `Stopped ${stoppedGPUs.length} GPU(s)`
            };
        }
    }

    async restartMiner(gpuIndex = null) {
        await this.stopMiner(gpuIndex);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return await this.startMiner(gpuIndex ? [gpuIndex] : null);
    }

    async getMinerLogs(gpuIndex = null, lines = 100) {
        if (gpuIndex !== null) {
            const logFile = path.join(LOG_DIR, `miner-gpu${gpuIndex}.log`);
            try {
                const logContent = await fs.readFile(logFile, 'utf8');
                const logLines = logContent.split('\n').slice(-lines);
                return {
                    success: true,
                    gpu_index: gpuIndex,
                    logs: logLines.join('\n')
                };
            } catch (error) {
                return {
                    success: false,
                    error: `Log file not found for GPU ${gpuIndex}`
                };
            }
        } else {
            // Get logs for all GPUs
            const allLogs = {};
            for (let i = 0; i < this.gpuInfo.length; i++) {
                const logFile = path.join(LOG_DIR, `miner-gpu${i}.log`);
                try {
                    const logContent = await fs.readFile(logFile, 'utf8');
                    const logLines = logContent.split('\n').slice(-lines);
                    allLogs[i] = logLines.join('\n');
                } catch (error) {
                    allLogs[i] = 'No logs available';
                }
            }
            return {
                success: true,
                logs: allLogs
            };
        }
    }

    async updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        await fs.writeFile(MINER_CONFIG, JSON.stringify(this.config, null, 2));
        return { success: true, config: this.config };
    }

    async getConfig() {
        await this.loadConfig();
        return { success: true, config: this.config };
    }
}

// Export singleton instance
const minerAPI = new MultiGPUMinerAPI();

module.exports = {
    getGPUs: () => minerAPI.getGPUs(),
    getMinerStatus: () => minerAPI.getMinerStatus(),
    startMiner: (gpuIndices) => minerAPI.startMiner(gpuIndices),
    stopMiner: (gpuIndex) => minerAPI.stopMiner(gpuIndex),
    restartMiner: (gpuIndex) => minerAPI.restartMiner(gpuIndex),
    getMinerLogs: (gpuIndex, lines) => minerAPI.getMinerLogs(gpuIndex, lines),
    updateConfig: (config) => minerAPI.updateConfig(config),
    getConfig: () => minerAPI.getConfig()
};

