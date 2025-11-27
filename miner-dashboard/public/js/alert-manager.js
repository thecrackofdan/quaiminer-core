/**
 * Alert Manager - Client-side alert management UI
 * Provides interface for configuring alerts, viewing history, and testing
 */

class AlertManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.rules = [];
        this.config = {};
        this.history = [];
        this.init();
    }

    async init() {
        await this.loadRules();
        await this.loadConfig();
        await this.loadHistory();
        this.setupUI();
    }

    /**
     * Load alert rules from server
     */
    async loadRules() {
        try {
            const response = await fetch('/api/alerts/rules', {
                headers: {
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                }
            });
            if (response.ok) {
                const data = await response.json();
                this.rules = data.rules || [];
            }
        } catch (error) {
            console.error('Error loading alert rules:', error);
        }
    }

    /**
     * Load alert configuration
     */
    async loadConfig() {
        try {
            const response = await fetch('/api/alerts/config', {
                headers: {
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                }
            });
            if (response.ok) {
                const data = await response.json();
                this.config = data.config || {};
            }
        } catch (error) {
            console.error('Error loading alert config:', error);
        }
    }

    /**
     * Load alert history
     */
    async loadHistory() {
        try {
            const response = await fetch('/api/alerts/history?limit=50', {
                headers: {
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                }
            });
            if (response.ok) {
                const data = await response.json();
                this.history = data.history || [];
            }
        } catch (error) {
            console.error('Error loading alert history:', error);
        }
    }

    /**
     * Setup UI elements
     */
    setupUI() {
        // Create alert settings button if it doesn't exist
        this.createAlertSettingsButton();
        
        // Create alert modal if it doesn't exist
        this.createAlertModal();
    }

    /**
     * Create alert settings button
     */
    createAlertSettingsButton() {
        // Check if button already exists
        if (document.getElementById('alertSettingsBtn')) return;

        // Find a good place to add the button (near other settings)
        const header = document.querySelector('.header') || document.querySelector('header');
        if (header) {
            const btn = document.createElement('button');
            btn.id = 'alertSettingsBtn';
            btn.className = 'btn btn-secondary';
            btn.innerHTML = '🔔 Alerts';
            btn.onclick = () => this.showAlertModal();
            header.appendChild(btn);
        }
    }

    /**
     * Create alert configuration modal
     */
    createAlertModal() {
        if (document.getElementById('alertModal')) return;

        const modal = document.createElement('div');
        modal.id = 'alertModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h2>🔔 Alert Configuration</h2>
                    <span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="alert-tabs">
                        <button class="tab-btn active" onclick="alertManager.showTab('rules')">Alert Rules</button>
                        <button class="tab-btn" onclick="alertManager.showTab('channels')">Notification Channels</button>
                        <button class="tab-btn" onclick="alertManager.showTab('history')">Alert History</button>
                    </div>
                    
                    <div id="alertRulesTab" class="alert-tab-content active">
                        <div style="margin-bottom: 1rem;">
                            <button class="btn btn-primary" onclick="alertManager.addRule()">+ Add Alert Rule</button>
                        </div>
                        <div id="alertRulesList"></div>
                    </div>
                    
                    <div id="alertChannelsTab" class="alert-tab-content">
                        <h3>Email Configuration</h3>
                        <div class="form-group">
                            <label>SMTP Host:</label>
                            <input type="text" id="emailHost" placeholder="smtp.gmail.com" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>SMTP Port:</label>
                            <input type="number" id="emailPort" placeholder="587" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Email (from):</label>
                            <input type="email" id="emailUser" placeholder="your-email@gmail.com" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Password/App Password:</label>
                            <input type="password" id="emailPass" placeholder="App password" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Send To:</label>
                            <input type="email" id="emailTo" placeholder="alerts@example.com" class="form-control">
                        </div>
                        <button class="btn btn-primary" onclick="alertManager.saveEmailConfig()">Save Email Config</button>
                        <button class="btn btn-secondary" onclick="alertManager.testAlert('email')">Test Email</button>
                        
                        <h3 style="margin-top: 2rem;">Telegram Configuration</h3>
                        <div class="form-group">
                            <label>Bot Token:</label>
                            <input type="text" id="telegramToken" placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" class="form-control">
                            <small>Get from @BotFather on Telegram</small>
                        </div>
                        <div class="form-group">
                            <label>Chat ID:</label>
                            <input type="text" id="telegramChatId" placeholder="123456789" class="form-control">
                            <small>Get from @userinfobot on Telegram</small>
                        </div>
                        <button class="btn btn-primary" onclick="alertManager.saveTelegramConfig()">Save Telegram Config</button>
                        <button class="btn btn-secondary" onclick="alertManager.testAlert('telegram')">Test Telegram</button>
                        
                        <h3 style="margin-top: 2rem;">Discord Configuration</h3>
                        <div class="form-group">
                            <label>Webhook URL:</label>
                            <input type="url" id="discordWebhook" placeholder="https://discord.com/api/webhooks/..." class="form-control">
                            <small>Create webhook in Discord channel settings</small>
                        </div>
                        <button class="btn btn-primary" onclick="alertManager.saveDiscordConfig()">Save Discord Config</button>
                        <button class="btn btn-secondary" onclick="alertManager.testAlert('discord')">Test Discord</button>
                    </div>
                    
                    <div id="alertHistoryTab" class="alert-tab-content">
                        <div id="alertHistoryList"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Show alert modal
     */
    showAlertModal() {
        const modal = document.getElementById('alertModal');
        if (modal) {
            modal.style.display = 'block';
            this.showTab('rules');
            this.renderRules();
            this.renderHistory();
            this.loadConfigIntoForm();
        }
    }

    /**
     * Show tab
     */
    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.alert-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const tab = document.getElementById(`alert${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
        if (tab) {
            tab.classList.add('active');
        }
        
        // Activate button
        event.target.classList.add('active');
    }

    /**
     * Render alert rules
     */
    renderRules() {
        const container = document.getElementById('alertRulesList');
        if (!container) return;

        if (this.rules.length === 0) {
            container.innerHTML = '<p>No alert rules configured. Click "Add Alert Rule" to create one.</p>';
            return;
        }

        container.innerHTML = this.rules.map(rule => `
            <div class="alert-rule-card" style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h4>${rule.name}</h4>
                        <p><strong>Type:</strong> ${rule.type}</p>
                        <p><strong>Condition:</strong> ${rule.condition.field} ${rule.condition.operator} ${rule.condition.value}</p>
                        <p><strong>Channels:</strong> ${rule.channels.join(', ')}</p>
                        <p><strong>Cooldown:</strong> ${rule.cooldown}s</p>
                        <p><strong>Status:</strong> <span style="color: ${rule.enabled ? 'green' : 'gray'}">${rule.enabled ? 'Enabled' : 'Disabled'}</span></p>
                    </div>
                    <div>
                        <button class="btn btn-small" onclick="alertManager.editRule('${rule.id}')">Edit</button>
                        <button class="btn btn-small btn-danger" onclick="alertManager.deleteRule('${rule.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render alert history
     */
    renderHistory() {
        const container = document.getElementById('alertHistoryList');
        if (!container) return;

        if (this.history.length === 0) {
            container.innerHTML = '<p>No alerts triggered yet.</p>';
            return;
        }

        container.innerHTML = this.history.map(alert => `
            <div class="alert-history-item" style="border-left: 3px solid #ff6b6b; padding: 0.5rem 1rem; margin-bottom: 0.5rem; background: #f9f9f9;">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <strong>${alert.rule_name}</strong>
                        <p style="margin: 0.25rem 0; color: #666;">${alert.message}</p>
                        <small style="color: #999;">${new Date(alert.timestamp).toLocaleString()}</small>
                    </div>
                    <div>
                        <span style="background: #e0e0e0; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.8rem;">
                            ${alert.channels.join(', ')}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load config into form
     */
    loadConfigIntoForm() {
        if (this.config.email) {
            document.getElementById('emailHost').value = this.config.email.smtp?.host || '';
            document.getElementById('emailPort').value = this.config.email.smtp?.port || '';
            document.getElementById('emailUser').value = this.config.email.smtp?.auth?.user || '';
            document.getElementById('emailTo').value = this.config.email.to || '';
        }
        if (this.config.telegram) {
            document.getElementById('telegramToken').value = this.config.telegram.botToken || '';
            document.getElementById('telegramChatId').value = this.config.telegram.chatId || '';
        }
        if (this.config.discord) {
            document.getElementById('discordWebhook').value = this.config.discord.webhookUrl || '';
        }
    }

    /**
     * Add new alert rule
     */
    addRule() {
        const rule = {
            id: 'rule_' + Date.now(),
            name: 'New Alert Rule',
            type: 'rig_status',
            condition: { field: 'isMining', operator: 'equals', value: false },
            enabled: true,
            channels: ['email'],
            cooldown: 300
        };
        this.saveRule(rule);
    }

    /**
     * Save alert rule
     */
    async saveRule(rule) {
        try {
            const response = await fetch('/api/alerts/rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                },
                body: JSON.stringify(rule)
            });
            
            if (response.ok) {
                await this.loadRules();
                this.renderRules();
                if (typeof Toast !== 'undefined') {
                    Toast.success('Alert rule saved');
                }
            }
        } catch (error) {
            console.error('Error saving alert rule:', error);
            if (typeof Toast !== 'undefined') {
                Toast.error('Failed to save alert rule');
            }
        }
    }

    /**
     * Delete alert rule
     */
    async deleteRule(ruleId) {
        if (!confirm('Are you sure you want to delete this alert rule?')) return;

        try {
            const response = await fetch(`/api/alerts/rules/${ruleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                }
            });
            
            if (response.ok) {
                await this.loadRules();
                this.renderRules();
                if (typeof Toast !== 'undefined') {
                    Toast.success('Alert rule deleted');
                }
            }
        } catch (error) {
            console.error('Error deleting alert rule:', error);
            if (typeof Toast !== 'undefined') {
                Toast.error('Failed to delete alert rule');
            }
        }
    }

    /**
     * Save email configuration
     */
    async saveEmailConfig() {
        const emailConfig = {
            enabled: true,
            smtp: {
                host: document.getElementById('emailHost').value,
                port: parseInt(document.getElementById('emailPort').value) || 587,
                secure: false,
                auth: {
                    user: document.getElementById('emailUser').value,
                    pass: document.getElementById('emailPass').value
                }
            },
            to: document.getElementById('emailTo').value
        };

        try {
            const response = await fetch('/api/alerts/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                },
                body: JSON.stringify({ email: emailConfig })
            });
            
            if (response.ok) {
                if (typeof Toast !== 'undefined') {
                    Toast.success('Email configuration saved');
                }
            }
        } catch (error) {
            console.error('Error saving email config:', error);
            if (typeof Toast !== 'undefined') {
                Toast.error('Failed to save email config');
            }
        }
    }

    /**
     * Save Telegram configuration
     */
    async saveTelegramConfig() {
        const telegramConfig = {
            enabled: true,
            botToken: document.getElementById('telegramToken').value,
            chatId: document.getElementById('telegramChatId').value
        };

        try {
            const response = await fetch('/api/alerts/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                },
                body: JSON.stringify({ telegram: telegramConfig })
            });
            
            if (response.ok) {
                if (typeof Toast !== 'undefined') {
                    Toast.success('Telegram configuration saved');
                }
            }
        } catch (error) {
            console.error('Error saving Telegram config:', error);
            if (typeof Toast !== 'undefined') {
                Toast.error('Failed to save Telegram config');
            }
        }
    }

    /**
     * Save Discord configuration
     */
    async saveDiscordConfig() {
        const discordConfig = {
            enabled: true,
            webhookUrl: document.getElementById('discordWebhook').value
        };

        try {
            const response = await fetch('/api/alerts/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                },
                body: JSON.stringify({ discord: discordConfig })
            });
            
            if (response.ok) {
                if (typeof Toast !== 'undefined') {
                    Toast.success('Discord configuration saved');
                }
            }
        } catch (error) {
            console.error('Error saving Discord config:', error);
            if (typeof Toast !== 'undefined') {
                Toast.error('Failed to save Discord config');
            }
        }
    }

    /**
     * Test alert
     */
    async testAlert(channel) {
        try {
            const response = await fetch('/api/alerts/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.dashboard.getAuthToken()}`,
                    'X-API-Key': this.dashboard.getApiKey()
                },
                body: JSON.stringify({
                    channel: channel,
                    rule: { name: 'Test Alert', type: 'rig_status' }
                })
            });
            
            if (response.ok) {
                if (typeof Toast !== 'undefined') {
                    Toast.success(`Test alert sent via ${channel}`);
                }
            }
        } catch (error) {
            console.error('Error sending test alert:', error);
            if (typeof Toast !== 'undefined') {
                Toast.error('Failed to send test alert');
            }
        }
    }
}

// Export
if (typeof window !== 'undefined') {
    window.AlertManager = AlertManager;
}
