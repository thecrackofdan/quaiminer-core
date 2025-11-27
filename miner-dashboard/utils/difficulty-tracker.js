/**
 * Difficulty Tracker - Real-time difficulty monitoring for all Quai chains
 * Tracks difficulty across Prime, Regions, and Zones for profitability optimization
 */

const logger = require('./logger');

class DifficultyTracker {
    constructor(nodeRpcUrl = 'http://localhost:8545') {
        this.nodeRpcUrl = nodeRpcUrl;
        this.difficulties = {
            Prime: null,
            Regions: {},
            Zones: {}
        };
        this.history = [];
        this.updateInterval = null;
        this.fetch = null;
        
        // Initialize fetch
        if (typeof globalThis.fetch === 'function') {
            this.fetch = globalThis.fetch;
        } else {
            try {
                this.fetch = require('node-fetch');
            } catch (e) {
                logger.warn('Fetch not available for difficulty tracking');
            }
        }
    }

    /**
     * Start tracking difficulties
     */
    start(intervalMs = 300000) { // 5 minutes default
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Initial fetch
        this.updateDifficulties();
        
        // Periodic updates
        this.updateInterval = setInterval(() => {
            this.updateDifficulties();
        }, intervalMs);
        
        logger.info('Difficulty tracker started');
    }

    /**
     * Stop tracking
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        logger.info('Difficulty tracker stopped');
    }

    /**
     * Update difficulties for all chains
     */
    async updateDifficulties() {
        try {
            // Fetch Prime difficulty
            await this.fetchDifficulty('Prime');
            
            // Fetch Region difficulties (Cyprus, Paxos, Hydra)
            await this.fetchDifficulty('Cyprus');
            await this.fetchDifficulty('Paxos');
            await this.fetchDifficulty('Hydra');
            
            // Fetch Zone difficulties (example zones)
            // Note: Actual zone names depend on Quai network configuration
            await this.fetchDifficulty('Zone-0');
            await this.fetchDifficulty('Zone-1');
            
            // Record in history
            this.recordHistory();
            
        } catch (error) {
            logger.error('Error updating difficulties:', error);
        }
    }

    /**
     * Fetch difficulty for a specific chain
     */
    async fetchDifficulty(chainName) {
        if (!this.fetch) {
            logger.warn('Fetch not available, skipping difficulty update');
            return;
        }

        try {
            // RPC call to get block difficulty
            const response = await this.fetch(this.nodeRpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_getBlockByNumber',
                    params: ['latest', false],
                    id: 1
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }

            const block = data.result;
            if (!block || !block.difficulty) {
                throw new Error('Invalid block data');
            }

            // Convert hex difficulty to number
            const difficulty = parseInt(block.difficulty, 16);
            
            // Store difficulty
            if (chainName === 'Prime') {
                this.difficulties.Prime = difficulty;
            } else if (chainName.startsWith('Zone-')) {
                this.difficulties.Zones[chainName] = difficulty;
            } else {
                this.difficulties.Regions[chainName] = difficulty;
            }

            logger.debug(`Difficulty updated for ${chainName}: ${difficulty}`);
            
        } catch (error) {
            logger.error(`Error fetching difficulty for ${chainName}:`, error);
        }
    }

    /**
     * Get current difficulty for a chain
     */
    getDifficulty(chainName) {
        if (chainName === 'Prime') {
            return this.difficulties.Prime;
        } else if (this.difficulties.Regions[chainName]) {
            return this.difficulties.Regions[chainName];
        } else if (this.difficulties.Zones[chainName]) {
            return this.difficulties.Zones[chainName];
        }
        return null;
    }

    /**
     * Get all current difficulties
     */
    getAllDifficulties() {
        return {
            ...this.difficulties,
            timestamp: Date.now()
        };
    }

    /**
     * Calculate profitability for a chain
     * Profitability = Block Reward / Difficulty
     */
    calculateProfitability(chainName, blockReward = 1) {
        const difficulty = this.getDifficulty(chainName);
        if (!difficulty || difficulty === 0) {
            return null;
        }
        
        return blockReward / difficulty;
    }

    /**
     * Get most profitable chain
     */
    getMostProfitableChain(blockRewards = {}) {
        let mostProfitable = null;
        let maxProfitability = 0;

        // Check Prime
        const primeProfit = this.calculateProfitability('Prime', blockRewards.Prime || 1);
        if (primeProfit && primeProfit > maxProfitability) {
            mostProfitable = 'Prime';
            maxProfitability = primeProfit;
        }

        // Check Regions
        for (const [region, difficulty] of Object.entries(this.difficulties.Regions)) {
            const profit = this.calculateProfitability(region, blockRewards[region] || 1);
            if (profit && profit > maxProfitability) {
                mostProfitable = region;
                maxProfitability = profit;
            }
        }

        // Check Zones
        for (const [zone, difficulty] of Object.entries(this.difficulties.Zones)) {
            const profit = this.calculateProfitability(zone, blockRewards[zone] || 1);
            if (profit && profit > maxProfitability) {
                mostProfitable = zone;
                maxProfitability = profit;
            }
        }

        return {
            chain: mostProfitable,
            profitability: maxProfitability
        };
    }

    /**
     * Record difficulty history
     */
    recordHistory() {
        const entry = {
            timestamp: Date.now(),
            difficulties: JSON.parse(JSON.stringify(this.difficulties))
        };
        
        this.history.push(entry);
        
        // Keep last 1000 entries (about 83 hours at 5-minute intervals)
        if (this.history.length > 1000) {
            this.history = this.history.slice(-1000);
        }
    }

    /**
     * Get difficulty history
     */
    getHistory(hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.history.filter(entry => entry.timestamp >= cutoff);
    }

    /**
     * Get difficulty trends
     */
    getTrends(chainName, hours = 24) {
        const history = this.getHistory(hours);
        const chainHistory = history.map(entry => {
            const difficulty = chainName === 'Prime' 
                ? entry.difficulties.Prime
                : entry.difficulties.Regions[chainName] || entry.difficulties.Zones[chainName];
            
            return {
                timestamp: entry.timestamp,
                difficulty: difficulty
            };
        }).filter(entry => entry.difficulty !== null);

        if (chainHistory.length < 2) {
            return null;
        }

        // Calculate trend (increasing/decreasing)
        const first = chainHistory[0].difficulty;
        const last = chainHistory[chainHistory.length - 1].difficulty;
        const change = ((last - first) / first) * 100;
        const trend = change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable';

        return {
            chain: chainName,
            trend: trend,
            changePercent: change,
            current: last,
            average: chainHistory.reduce((sum, e) => sum + e.difficulty, 0) / chainHistory.length,
            min: Math.min(...chainHistory.map(e => e.difficulty)),
            max: Math.max(...chainHistory.map(e => e.difficulty))
        };
    }

    /**
     * Get all chain trends
     */
    getAllTrends(hours = 24) {
        const trends = {};
        
        // Prime trend
        const primeTrend = this.getTrends('Prime', hours);
        if (primeTrend) trends.Prime = primeTrend;

        // Region trends
        for (const region of Object.keys(this.difficulties.Regions)) {
            const trend = this.getTrends(region, hours);
            if (trend) trends[region] = trend;
        }

        // Zone trends
        for (const zone of Object.keys(this.difficulties.Zones)) {
            const trend = this.getTrends(zone, hours);
            if (trend) trends[zone] = trend;
        }

        return trends;
    }
}

module.exports = DifficultyTracker;

