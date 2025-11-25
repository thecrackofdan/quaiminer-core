// Machine Learning Features for QuaiMiner CORE
class MLFeatures {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.temperatureHistory = [];
        this.hashRateHistory = [];
        this.powerHistory = [];
        this.init();
    }
    
    init() {
        // Collect data for ML analysis
        setInterval(() => this.collectData(), 60000); // Every minute
        setInterval(() => this.analyze(), 300000); // Every 5 minutes
    }
    
    collectData() {
        if (this.dashboard && this.dashboard.miningData) {
            const data = this.dashboard.miningData;
            
            // Collect temperature data
            if (data.gpus && data.gpus.length > 0) {
                const avgTemp = data.gpus.reduce((sum, gpu) => sum + (gpu.temperature || 0), 0) / data.gpus.length;
                this.temperatureHistory.push({
                    timestamp: Date.now(),
                    temperature: avgTemp
                });
            }
            
            // Collect hash rate
            this.hashRateHistory.push({
                timestamp: Date.now(),
                hashRate: data.hashRate || 0
            });
            
            // Collect power usage
            this.powerHistory.push({
                timestamp: Date.now(),
                power: data.powerUsage || 0
            });
            
            // Keep only last 1000 data points
            if (this.temperatureHistory.length > 1000) {
                this.temperatureHistory.shift();
            }
            if (this.hashRateHistory.length > 1000) {
                this.hashRateHistory.shift();
            }
            if (this.powerHistory.length > 1000) {
                this.powerHistory.shift();
            }
        }
    }
    
    analyze() {
        // Anomaly detection
        this.detectAnomalies();
        
        // Predictive maintenance
        this.predictiveMaintenance();
        
        // Optimization suggestions
        this.optimizationSuggestions();
    }
    
    detectAnomalies() {
        if (this.temperatureHistory.length < 10) return;
        
        // Simple anomaly detection: check for sudden temperature spikes
        const recent = this.temperatureHistory.slice(-10);
        const avgTemp = recent.reduce((sum, d) => sum + d.temperature, 0) / recent.length;
        const currentTemp = recent[recent.length - 1].temperature;
        
        // If temperature is 20% higher than average, it's an anomaly
        if (currentTemp > avgTemp * 1.2) {
            this.showAlert('Temperature Anomaly', 
                `GPU temperature (${currentTemp.toFixed(1)}°C) is significantly higher than average (${avgTemp.toFixed(1)}°C). Check cooling system.`);
        }
        
        // Hash rate drop detection
        if (this.hashRateHistory.length >= 10) {
            const recentHash = this.hashRateHistory.slice(-10);
            const avgHash = recentHash.reduce((sum, d) => sum + d.hashRate, 0) / recentHash.length;
            const currentHash = recentHash[recentHash.length - 1].hashRate;
            
            if (currentHash < avgHash * 0.8 && avgHash > 0) {
                this.showAlert('Hash Rate Drop', 
                    `Hash rate dropped to ${currentHash.toFixed(2)} MH/s from average ${avgHash.toFixed(2)} MH/s. Check miner status.`);
            }
        }
    }
    
    predictiveMaintenance() {
        if (this.temperatureHistory.length < 50) return;
        
        // Simple trend analysis: if temperature is gradually increasing
        const recent = this.temperatureHistory.slice(-50);
        const early = recent.slice(0, 25);
        const late = recent.slice(25);
        
        const earlyAvg = early.reduce((sum, d) => sum + d.temperature, 0) / early.length;
        const lateAvg = late.reduce((sum, d) => sum + d.temperature, 0) / late.length;
        
        // If temperature increased by more than 5°C over time
        if (lateAvg > earlyAvg + 5) {
            this.showSuggestion('Maintenance Recommendation', 
                'GPU temperature is gradually increasing. Consider cleaning fans and checking thermal paste.');
        }
    }
    
    optimizationSuggestions() {
        if (!this.dashboard || !this.dashboard.miningData) return;
        
        const data = this.dashboard.miningData;
        
        // Efficiency optimization
        if (data.hashRate > 0 && data.powerUsage > 0) {
            const efficiency = data.hashRate / data.powerUsage;
            
            // If efficiency is low, suggest optimization
            if (efficiency < 0.05) {
                this.showSuggestion('Optimization Suggestion', 
                    'Hash rate per watt is low. Consider adjusting GPU settings for better efficiency.');
            }
        }
        
        // Temperature optimization
        if (data.gpus && data.gpus.length > 0) {
            const maxTemp = Math.max(...data.gpus.map(gpu => gpu.temperature || 0));
            if (maxTemp > 80) {
                this.showSuggestion('Temperature Optimization', 
                    'GPU temperature is high. Consider increasing fan speed or reducing power limit.');
            } else if (maxTemp < 60 && data.powerUsage > 0) {
                this.showSuggestion('Performance Optimization', 
                    'GPU temperature is low. You may be able to increase power limit for better performance.');
            }
        }
    }
    
    showAlert(title, message) {
        console.warn(`[ML Alert] ${title}: ${message}`);
        // Could integrate with notification system
        if (typeof this.dashboard !== 'undefined' && this.dashboard.addLog) {
            this.dashboard.addLog(`[ML] ${title}: ${message}`, 'warning');
        }
    }
    
    showSuggestion(title, message) {
        console.log(`[ML Suggestion] ${title}: ${message}`);
        // Could integrate with notification system
        if (typeof this.dashboard !== 'undefined' && this.dashboard.addLog) {
            this.dashboard.addLog(`[ML] ${title}: ${message}`, 'info');
        }
    }
    
    // Get optimization recommendations
    getRecommendations() {
        const recommendations = [];
        
        if (!this.dashboard || !this.dashboard.miningData) {
            return recommendations;
        }
        
        const data = this.dashboard.miningData;
        
        // Hash rate recommendations
        if (data.hashRate < 5) {
            recommendations.push({
                type: 'performance',
                title: 'Low Hash Rate',
                message: 'Hash rate is below optimal. Check GPU settings and miner configuration.',
                priority: 'high'
            });
        }
        
        // Temperature recommendations
        if (data.gpus && data.gpus.length > 0) {
            const avgTemp = data.gpus.reduce((sum, gpu) => sum + (gpu.temperature || 0), 0) / data.gpus.length;
            if (avgTemp > 75) {
                recommendations.push({
                    type: 'maintenance',
                    title: 'High Temperature',
                    message: 'Average GPU temperature is high. Consider improving cooling.',
                    priority: 'medium'
                });
            }
        }
        
        // Power efficiency recommendations
        if (data.hashRate > 0 && data.powerUsage > 0) {
            const efficiency = data.hashRate / data.powerUsage;
            if (efficiency < 0.05) {
                recommendations.push({
                    type: 'optimization',
                    title: 'Low Efficiency',
                    message: 'Power efficiency is low. Consider optimizing GPU settings.',
                    priority: 'low'
                });
            }
        }
        
        return recommendations;
    }
}

// Export for use in dashboard
if (typeof window !== 'undefined') {
    window.MLFeatures = MLFeatures;
}

