/**
 * Auto Chain Switcher - Automatically switches to most profitable chain
 * Monitors difficulty across all Quai chains and switches mining preference
 */

const DifficultyTracker = require('./difficulty-tracker');
const logger = require('./logger');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class AutoChainSwitcher {
    constructor(nodeRpcUrl = 'http://localhost:8545', minerConfigPath = '/etc/quaiminer/config.json') {
        this.difficultyTracker = new DifficultyTracker(nodeRpcUrl);
        this.minerConfigPath = minerConfigPath;
        this.isEnabled = false;
        this.currentChain = null;
        this.switchInterval = null;
        this.checkInterval = 300000; // Check every 5 minutes
        this.profitabilityThreshold = 0.05; // 5% minimum improvement to switch
        this.switchHistory = [];
        this.blockRewards = {
            Prime: 1.0,
            Cyprus: 0.8,
            Paxos: 0.8,
            Hydra: 0.8,
            'Zone-0': 0.6,
            'Zone-1': 0.6,
            'Zone-2': 0.6,
            'Zone-3': 0.6
        };
        this.shardingEnabled = false;
        this.zonePreferences = [];
    }

    /**
     * Start auto-switching
     */
    start() {
        if (this.isEnabled) {
            logger.warn('Auto chain switcher already running');
            return;
        }

        this.isEnabled = true;
        this.difficultyTracker.start(this.checkInterval);
        
        // Check and switch immediately
        this.checkAndSwitch();
        
        // Then check periodically
        this.switchInterval = setInterval(() => {
            this.checkAndSwitch();
        }, this.checkInterval);
        
        logger.info('Auto chain switcher started');
    }

    /**
     * Stop auto-switching
     */
    stop() {
        if (!this.isEnabled) {
            return;
        }

        this.isEnabled = false;
        this.difficultyTracker.stop();
        
        if (this.switchInterval) {
            clearInterval(this.switchInterval);
            this.switchInterval = null;
        }
        
        logger.info('Auto chain switcher stopped');
    }

    /**
     * Check profitability and switch if needed
     */
    async checkAndSwitch() {
        if (!this.isEnabled) {
            return;
        }

        try {
            // Update difficulties
            await this.difficultyTracker.updateDifficulties();
            
            // Get most profitable chain
            const mostProfitable = this.difficultyTracker.getMostProfitableChain(this.blockRewards);
            
            if (!mostProfitable.chain) {
                logger.warn('No profitable chain found');
                return;
            }

            // Check if we should switch
            if (this.shouldSwitch(mostProfitable.chain, mostProfitable.profitability)) {
                await this.switchToChain(mostProfitable.chain);
            }
            
        } catch (error) {
            logger.error('Error in auto chain switching:', error);
        }
    }

    /**
     * Determine if we should switch chains
     */
    shouldSwitch(targetChain, targetProfitability) {
        // If no current chain, always switch
        if (!this.currentChain) {
            return true;
        }

        // If same chain, don't switch
        if (this.currentChain === targetChain) {
            return false;
        }

        // Get current chain profitability
        const currentProfitability = this.difficultyTracker.calculateProfitability(
            this.currentChain,
            this.blockRewards[this.currentChain] || 1
        );

        if (!currentProfitability) {
            return true; // Switch if current chain profitability unknown
        }

        // Calculate improvement percentage
        const improvement = ((targetProfitability - currentProfitability) / currentProfitability) * 100;

        // Switch if improvement exceeds threshold
        return improvement >= (this.profitabilityThreshold * 100);
    }

    /**
     * Switch miner to target chain
     */
    async switchToChain(chainName) {
        try {
            logger.info(`Switching to chain: ${chainName}`);
            
            // Update miner configuration
            await this.updateMinerConfig(chainName);
            
            // Restart miner if running
            await this.restartMiner();
            
            // Record switch
            this.recordSwitch(chainName);
            
            this.currentChain = chainName;
            
            logger.info(`Successfully switched to ${chainName}`);
            
        } catch (error) {
            logger.error(`Error switching to chain ${chainName}:`, error);
            throw error;
        }
    }

    /**
     * Update miner configuration for target chain
     */
    async updateMinerConfig(chainName) {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            // Read current config
            let config = {};
            try {
                const configData = await fs.readFile(this.minerConfigPath, 'utf8');
                config = JSON.parse(configData);
            } catch (e) {
                // Config doesn't exist, create default
                config = {
                    miner: {
                        stratum: '',
                        wallet: '',
                        worker: 'rig-' + require('os').hostname()
                    },
                    node: {
                        rpcUrl: 'http://localhost:8545',
                        requireSynced: true
                    }
                };
            }

            // Update chain preference
            if (!config.mining) {
                config.mining = {};
            }
            config.mining.preferredChain = chainName;
            config.mining.autoSwitch = true;
            config.mining.lastSwitch = Date.now();

            // Handle zone sharding
            if (this.shardingEnabled && chainName.startsWith('Zone-')) {
                config.mining.sharding = {
                    enabled: true,
                    activeZones: this.zonePreferences.length > 0 ? this.zonePreferences : [chainName],
                    preferredZone: chainName
                };
            }

            // Write config
            await fs.mkdir(path.dirname(this.minerConfigPath), { recursive: true });
            await fs.writeFile(this.minerConfigPath, JSON.stringify(config, null, 2));
            
        } catch (error) {
            logger.error('Error updating miner config:', error);
            throw error;
        }
    }

    /**
     * Restart miner service
     */
    async restartMiner() {
        try {
            // Check if miner service exists
            try {
                await execAsync('systemctl is-active quai-gpu-miner');
            } catch (e) {
                // Service not running, start it
                await execAsync('systemctl start quai-gpu-miner');
                return;
            }

            // Restart service
            await execAsync('systemctl restart quai-gpu-miner');
            
        } catch (error) {
            logger.error('Error restarting miner:', error);
            // Don't throw - miner might not be running as service
        }
    }

    /**
     * Record chain switch
     */
    recordSwitch(chainName) {
        const switchRecord = {
            chain: chainName,
            timestamp: Date.now(),
            profitability: this.difficultyTracker.calculateProfitability(
                chainName,
                this.blockRewards[chainName] || 1
            )
        };
        
        this.switchHistory.push(switchRecord);
        
        // Keep last 100 switches
        if (this.switchHistory.length > 100) {
            this.switchHistory = this.switchHistory.slice(-100);
        }
    }

    /**
     * Enable zone sharding mode
     */
    enableSharding(zones = []) {
        this.shardingEnabled = true;
        this.zonePreferences = zones.length > 0 ? zones : ['Zone-0', 'Zone-1', 'Zone-2', 'Zone-3'];
        logger.info('Zone sharding enabled', { zones: this.zonePreferences });
    }

    /**
     * Disable zone sharding mode
     */
    disableSharding() {
        this.shardingEnabled = false;
        this.zonePreferences = [];
        logger.info('Zone sharding disabled');
    }

    /**
     * Get current status
     */
    getStatus() {
        const allDifficulties = this.difficultyTracker.getAllDifficulties();
        const mostProfitable = this.difficultyTracker.getMostProfitableChain(this.blockRewards);
        
        return {
            enabled: this.isEnabled,
            currentChain: this.currentChain,
            mostProfitableChain: mostProfitable.chain,
            profitability: mostProfitable.profitability,
            difficulties: allDifficulties,
            shardingEnabled: this.shardingEnabled,
            zonePreferences: this.zonePreferences,
            switchHistory: this.switchHistory.slice(-10), // Last 10 switches
            lastCheck: this.difficultyTracker.history.length > 0 
                ? this.difficultyTracker.history[this.difficultyTracker.history.length - 1].timestamp 
                : null
        };
    }

    /**
     * Update block rewards
     */
    updateBlockRewards(rewards) {
        this.blockRewards = { ...this.blockRewards, ...rewards };
        logger.info('Block rewards updated', { rewards: this.blockRewards });
    }

    /**
     * Set profitability threshold
     */
    setThreshold(threshold) {
        this.profitabilityThreshold = Math.max(0, Math.min(1, threshold)); // Clamp between 0 and 1
        logger.info('Profitability threshold updated', { threshold: this.profitabilityThreshold });
    }
}

module.exports = AutoChainSwitcher;

