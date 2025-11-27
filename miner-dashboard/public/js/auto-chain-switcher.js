/**
 * Auto Chain Switcher UI - Client-side interface for automatic chain switching
 */

class AutoChainSwitcherUI {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.status = null;
        this.updateInterval = null;
        this.init();
    }

    async init() {
        await this.loadStatus();
        this.setupUI();
        this.startUpdates();
    }

    /**
     * Setup UI elements
     */
    setupUI() {
        // Create auto-switch section if it doesn't exist
        this.createAutoSwitchSection();
    }

    /**
     * Create auto-switch section in dashboard
     */
    createAutoSwitchSection() {
        // Check if section already exists
        if (document.getElementById('autoSwitchSection')) return;

        // Find a good place to add it (after mining stats)
        const statsSection = document.querySelector('.mining-stats-section') || 
                            document.querySelector('.gpu-section-top');
        
        if (statsSection) {
            const section = document.createElement('section');
            section.id = 'autoSwitchSection';
            section.className = 'auto-switch-section';
            section.innerHTML = `
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h2 style="color: var(--quai-primary); margin: 0;">🔄 Auto Chain Switcher</h2>
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="autoSwitchToggle" style="width: 20px; height: 20px; cursor: pointer;">
                            <span>Enable Auto-Switch</span>
                        </label>
                    </div>
                    
                    <div id="autoSwitchStatus" style="margin-bottom: 1rem;">
                        <p style="color: var(--text-secondary);">Loading status...</p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <div style="background: var(--bg-dark); padding: 1rem; border-radius: 8px;">
                            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.25rem;">Current Chain</div>
                            <div id="currentChain" style="color: var(--quai-primary); font-size: 1.2rem; font-weight: 600;">-</div>
                        </div>
                        <div style="background: var(--bg-dark); padding: 1rem; border-radius: 8px;">
                            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.25rem;">Most Profitable</div>
                            <div id="mostProfitableChain" style="color: var(--success-color); font-size: 1.2rem; font-weight: 600;">-</div>
                        </div>
                        <div style="background: var(--bg-dark); padding: 1rem; border-radius: 8px;">
                            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.25rem;">Profitability</div>
                            <div id="profitability" style="color: var(--text-primary); font-size: 1.2rem; font-weight: 600;">-</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem;">
                        <h3 style="color: var(--text-primary); font-size: 1rem; margin-bottom: 0.5rem;">Zone Sharding</h3>
                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="shardingToggle" style="width: 18px; height: 18px; cursor: pointer;">
                            <span>Enable Zone Sharding (auto-mine most profitable zones)</span>
                        </label>
                        <div id="zonePreferences" style="margin-top: 0.5rem; display: none;">
                            <label style="display: block; color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.25rem;">Preferred Zones:</label>
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                                    <input type="checkbox" class="zone-checkbox" value="Zone-0" checked> Zone-0
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                                    <input type="checkbox" class="zone-checkbox" value="Zone-1" checked> Zone-1
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                                    <input type="checkbox" class="zone-checkbox" value="Zone-2" checked> Zone-2
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                                    <input type="checkbox" class="zone-checkbox" value="Zone-3" checked> Zone-3
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <h3 style="color: var(--text-primary); font-size: 1rem; margin-bottom: 0.5rem;">Switch History</h3>
                        <div id="switchHistory" style="max-height: 200px; overflow-y: auto;">
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">No switches yet</p>
                        </div>
                    </div>
                </div>
            `;
            
            statsSection.parentNode.insertBefore(section, statsSection.nextSibling);
            
            // Setup event listeners
            document.getElementById('autoSwitchToggle').addEventListener('change', (e) => {
                this.toggleAutoSwitch(e.target.checked);
            });
            
            document.getElementById('shardingToggle').addEventListener('change', (e) => {
                this.toggleSharding(e.target.checked);
            });
            
            // Zone checkbox listeners
            document.querySelectorAll('.zone-checkbox').forEach(cb => {
                cb.addEventListener('change', () => {
                    this.updateZonePreferences();
                });
            });
        }
    }

    /**
     * Load current status
     */
    async loadStatus() {
        try {
            const response = await fetch('/api/auto-switch/status');
            if (response.ok) {
                const data = await response.json();
                this.status = data;
                this.updateUI();
            }
        } catch (error) {
            console.error('Error loading auto-switch status:', error);
        }
    }

    /**
     * Update UI with current status
     */
    updateUI() {
        if (!this.status) return;

        const statusDiv = document.getElementById('autoSwitchStatus');
        const toggle = document.getElementById('autoSwitchToggle');
        const currentChain = document.getElementById('currentChain');
        const mostProfitable = document.getElementById('mostProfitableChain');
        const profitability = document.getElementById('profitability');
        const shardingToggle = document.getElementById('shardingToggle');
        const zonePrefs = document.getElementById('zonePreferences');
        const historyDiv = document.getElementById('switchHistory');

        // Update toggle
        if (toggle) {
            toggle.checked = this.status.enabled;
        }

        // Update status message
        if (statusDiv) {
            if (this.status.enabled) {
                statusDiv.innerHTML = `<p style="color: var(--success-color);">✅ Auto-switching is active. Monitoring every 5 minutes.</p>`;
            } else {
                statusDiv.innerHTML = `<p style="color: var(--text-secondary);">⏸️ Auto-switching is disabled.</p>`;
            }
        }

        // Update current chain
        if (currentChain) {
            currentChain.textContent = this.status.currentChain || 'Not set';
        }

        // Update most profitable
        if (mostProfitable) {
            mostProfitable.textContent = this.status.mostProfitableChain || 'Calculating...';
        }

        // Update profitability
        if (profitability) {
            if (this.status.profitability) {
                profitability.textContent = (this.status.profitability * 100).toFixed(2) + '%';
            } else {
                profitability.textContent = '-';
            }
        }

        // Update sharding
        if (shardingToggle) {
            shardingToggle.checked = this.status.shardingEnabled;
        }

        if (zonePrefs) {
            zonePrefs.style.display = this.status.shardingEnabled ? 'block' : 'none';
        }

        // Update zone checkboxes
        if (this.status.zonePreferences && this.status.zonePreferences.length > 0) {
            document.querySelectorAll('.zone-checkbox').forEach(cb => {
                cb.checked = this.status.zonePreferences.includes(cb.value);
            });
        }

        // Update history
        if (historyDiv && this.status.switchHistory) {
            if (this.status.switchHistory.length > 0) {
                historyDiv.innerHTML = this.status.switchHistory.map(switch_ => `
                    <div style="padding: 0.5rem; background: var(--bg-dark); border-radius: 4px; margin-bottom: 0.5rem; font-size: 0.9rem;">
                        <strong style="color: var(--quai-primary);">${switch_.chain}</strong>
                        <span style="color: var(--text-secondary); margin-left: 0.5rem;">
                            ${new Date(switch_.timestamp).toLocaleString()}
                        </span>
                    </div>
                `).join('');
            } else {
                historyDiv.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No switches yet</p>';
            }
        }
    }

    /**
     * Toggle auto-switch
     */
    async toggleAutoSwitch(enabled) {
        try {
            const endpoint = enabled ? '/api/auto-switch/start' : '/api/auto-switch/stop';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                }
            });
            
            if (response.ok) {
                await this.loadStatus();
                if (typeof Toast !== 'undefined') {
                    Toast.success(enabled ? 'Auto-switching enabled' : 'Auto-switching disabled');
                }
            }
        } catch (error) {
            console.error('Error toggling auto-switch:', error);
            if (typeof Toast !== 'undefined') {
                Toast.error('Failed to toggle auto-switch');
            }
        }
    }

    /**
     * Toggle sharding
     */
    async toggleSharding(enabled) {
        try {
            const endpoint = enabled ? '/api/auto-switch/sharding/enable' : '/api/auto-switch/sharding/disable';
            const zones = enabled ? this.getSelectedZones() : [];
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                },
                body: JSON.stringify({ zones })
            });
            
            if (response.ok) {
                await this.loadStatus();
                if (typeof Toast !== 'undefined') {
                    Toast.success(enabled ? 'Zone sharding enabled' : 'Zone sharding disabled');
                }
            }
        } catch (error) {
            console.error('Error toggling sharding:', error);
            if (typeof Toast !== 'undefined') {
                Toast.error('Failed to toggle sharding');
            }
        }
    }

    /**
     * Get selected zones
     */
    getSelectedZones() {
        const selected = [];
        document.querySelectorAll('.zone-checkbox:checked').forEach(cb => {
            selected.push(cb.value);
        });
        return selected;
    }

    /**
     * Update zone preferences
     */
    async updateZonePreferences() {
        if (this.status && this.status.shardingEnabled) {
            await this.toggleSharding(true); // Re-enable with new zones
        }
    }

    /**
     * Start periodic updates
     */
    startUpdates() {
        this.updateInterval = setInterval(() => {
            this.loadStatus();
        }, 30000); // Update every 30 seconds
    }

    /**
     * Stop updates
     */
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.AutoChainSwitcherUI = AutoChainSwitcherUI;
}

