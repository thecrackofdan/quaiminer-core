// Mining Dashboard JavaScript
class MiningDashboard {
    constructor() {
        // Verify CONFIG is available
        if (typeof CONFIG === 'undefined') {
            throw new Error('CONFIG is not defined. Make sure config.js loads before dashboard.js');
        }
        
        // Verify essential CONFIG properties exist
        if (!CONFIG.charts || typeof CONFIG.charts.maxHistoryPoints === 'undefined') {
            console.warn('CONFIG.charts.maxHistoryPoints not found, using default: 60');
        }
        if (typeof CONFIG.updateInterval === 'undefined') {
            console.warn('CONFIG.updateInterval not found, using default: 5000');
        }
        
        this.startTime = Date.now();
        this.hashRateHistory = [];
        this.temperatureHistory = [];
        this.maxHistoryPoints = (CONFIG.charts && CONFIG.charts.maxHistoryPoints) ? CONFIG.charts.maxHistoryPoints : 60;
        this.updateInterval = CONFIG.updateInterval || 5000;
        
        // Running averages (store recent values for averaging)
        this.runningAverages = {
            hashRate: [],
            temperature: [],
            shareRate: [],
            powerUsage: [],
            maxSamples: 60 // Keep last 60 samples for average (5 min at 5 sec intervals)
        };

        // QuaiScan data (transaction data only)
        this.quaiscanData = {
            addressInfo: null,
            transactionHistory: [],
            lastUpdate: null
        };
        
        // Elastic blockchain data (network statistics)
        this.elasticData = {
            networkHashRate: 0,
            latestBlock: 0,
            blockTime: 0,
            difficulty: 0,
            lastUpdate: null
        };
        
        // QuaiScan network metrics data
        this.quaiscanMetricsData = {
            totalTransactions: 0,
            totalAddresses: 0,
            networkHashRate: 0,
            latestBlock: 0,
            lastUpdate: null
        };
        
        // Prometheus metrics data
        this.prometheusData = {
            blockHeight: 0,
            difficulty: 0,
            blockTime: 0,
            networkHashRate: 0,
            peerCount: 0,
            syncStatus: false,
            lastUpdate: null
        };
        
        // Wallet connection
        this.connectedWallet = null;
        
        // Prometheus integration
        this.prometheusInterval = null;
        this.prometheusErrorLogged = false;

        // Initialize mining data
        this.miningData = {
            hashRate: 0,
            acceptedShares: 0,
            rejectedShares: 0,
            shareRate: 0, // Shares per minute
            powerUsage: 0,
            efficiency: 0,
            gpus: (CONFIG.gpus && Array.isArray(CONFIG.gpus) && CONFIG.gpus.length > 0) ? CONFIG.gpus.map(gpu => ({
                ...gpu,
                hashRate: 0,
                temperature: gpu.targetTemp || 40,
                fanSpeed: 30,
                powerUsage: 0,
                memoryTemp: gpu.targetTemp || 40
            })) : [],
            isMining: false,
            // Quai Network specific data
            network: {
                nodeSynced: false,
                currentChain: (CONFIG.network && CONFIG.network.chains && CONFIG.network.chains.length > 0) ? CONFIG.network.chains[0].name : 'Prime',
                blockHeight: 0,
                difficulty: 0,
                gasPrice: 0,
                peerCount: 0,
                blockTime: 0,
                lastBlockTime: null,
                pendingTransactions: 0,
                lastMetricsUpdate: null,
                mergedMining: (CONFIG.mining && CONFIG.mining.mergedMining && CONFIG.mining.mergedMining.enabled) || false,
                algorithm: 'ProgPoW', // SOAP upgrade: KawPoW → ProgPoW
                protocol: 'SOAP'
            },
            // Solo mining rewards
            rewards: {
                quaiEarnings: 0,
                qiEarnings: 0,
                blocksFound: 0,
                lastBlockTime: null,
                estimatedTimeToBlock: null, // in seconds
                blockProbability: 0
            },
            // History for charts
            rewardHistory: [],
            difficultyHistory: [],
            shareHistory: []
        };

        this.init();
    }

    init() {
        try {
            // Initialize GPU data immediately
            if (!this.miningData.gpus || this.miningData.gpus.length === 0) {
                if (CONFIG.gpus && Array.isArray(CONFIG.gpus) && CONFIG.gpus.length > 0) {
                    this.miningData.gpus = CONFIG.gpus.map(gpu => ({
                        ...gpu,
                        hashRate: 0,
                        temperature: gpu.targetTemp || 40,
                        fanSpeed: 30,
                        powerUsage: 0,
                        memoryTemp: gpu.targetTemp || 40
                    }));
                }
            }
            
            this.setupCharts();
            this.updateQuaiNetworkInfo();
            this.initPelagusWallet();
            this.initManualAddressInput();
            this.startUpdates();
            this.updateGPUCards();
        
            // Hide loading indicator
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        } catch (error) {
            console.error('ERROR in init():', error);
            this.addLog(`Initialization error: ${error.message}`, 'error');
            
            // Show error in loading indicator
            const loadingStatus = document.getElementById('loadingStatus');
            if (loadingStatus) {
                loadingStatus.textContent = `Error: ${error.message}`;
                loadingStatus.style.color = '#FF0000';
            }
            throw error;
        }
        this.updateStatus('active');
        this.addLog('QuaiMiner CORE Dashboard initialized', 'info');
        const miningMode = (CONFIG.mining && CONFIG.mining.mode) ? CONFIG.mining.mode : 'solo';
        this.addLog(`Mining mode: ${miningMode}`, 'info');
        if (CONFIG.mining && CONFIG.mining.mergedMining && CONFIG.mining.mergedMining.enabled) {
            const chains = (CONFIG.mining.mergedMining.chains && Array.isArray(CONFIG.mining.mergedMining.chains)) 
                ? CONFIG.mining.mergedMining.chains.join(', ') 
                : 'none';
            this.addLog(`Merged mining enabled: ${chains}`, 'info');
        }
        if (CONFIG.api && CONFIG.api.stratum && CONFIG.api.stratum.enabled) {
            const stratumUrl = CONFIG.api.stratum.url || 'not configured';
            this.addLog(`Stratum proxy: ${stratumUrl}`, 'info');
            this.checkStratumConnection();
        }
        
        // Start API connection if enabled
        if (CONFIG.api && CONFIG.api.enabled) {
            this.startAPIConnection();
        }

        // Check Quai node status if solo mining
        if (miningMode === 'solo' && CONFIG.node && CONFIG.node.requireSynced) {
            this.checkNodeStatus();
        }

        // Start fetching real node metrics if enabled
        if (CONFIG.node && CONFIG.node.enableMetrics) {
            this.startNodeMetrics();
        }

        // Setup node connection test button
        const testBtn = document.getElementById('testNodeConnection');
        if (testBtn) {
            testBtn.onclick = () => this.testNodeConnection();
        }
        
        // Initialize Prometheus integration if enabled
        if (CONFIG.node && CONFIG.node.prometheus && CONFIG.node.prometheus.enabled) {
            this.initPrometheus();
        }

        // Setup RPC URL input
        const rpcUrlInput = document.getElementById('rpcUrlInput');
        const updateRpcBtn = document.getElementById('updateRpcUrl');
        if (rpcUrlInput) {
            rpcUrlInput.value = CONFIG.node.rpcUrl;
        }
        if (updateRpcBtn) {
            updateRpcBtn.onclick = () => {
                const newUrl = rpcUrlInput.value.trim();
                if (newUrl) {
                    CONFIG.node.rpcUrl = newUrl;
                    this.addLog(`RPC URL updated to: ${newUrl}`, 'info');
                    // Test the new URL
                    this.testNodeConnection();
                }
            };
        }

        // Setup interval selector
        const intervalSelect = document.getElementById('updateIntervalSelect');
        if (intervalSelect) {
            intervalSelect.value = CONFIG.updateInterval.toString();
            intervalSelect.onchange = (e) => {
                const newInterval = parseInt(e.target.value);
                this.updateInterval = newInterval;
                CONFIG.updateInterval = newInterval;
                this.addLog(`Update interval changed to ${newInterval / 1000} seconds`, 'info');
                
                // Restart updates with new interval
                if (this.updateTimer) {
                    clearInterval(this.updateTimer);
                }
                this.startUpdates();
            };
        }

            // Start QuaiScan (transaction data only)
            if (CONFIG.quaiscan && CONFIG.quaiscan.enabled) {
                this.initQuaiScan();
            }
            
            // Start Elastic blockchain data integration
            if (CONFIG.elastic && CONFIG.elastic.enabled) {
                this.initElastic();
            }
            
            // Start QuaiScan network metrics
            if (CONFIG.quaiscan && CONFIG.quaiscan.enabled && CONFIG.quaiscan.features.networkStats) {
                this.initQuaiScanMetrics();
            }
            
            // Initialize export and settings functionality
            this.initExportAndSettings();
            
            // Load saved settings from localStorage
            this.loadSettings();
            
            // Initialize tooltips
            this.initTooltips();
            
            // Initialize validated blocks tracking
            this.initValidatedBlocks();
            
            // Initialize miner configuration and remote management
            this.initMinerManagement();
    }
    
    /**
     * Initialize export and settings functionality
     */
    initExportAndSettings() {
        // Export button
        const exportBtn = document.getElementById('exportDataBtn');
        if (exportBtn) {
            exportBtn.onclick = () => this.exportMiningData();
        }
        
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        
        if (settingsBtn && settingsModal) {
            settingsBtn.onclick = () => {
                settingsModal.style.display = 'block';
                this.loadSettingsUI();
            };
        }
        
        if (closeSettingsBtn && settingsModal) {
            closeSettingsBtn.onclick = () => {
                settingsModal.style.display = 'none';
            };
        }
        
        // Settings checkboxes
        const enableNotifications = document.getElementById('enableNotifications');
        const persistSettings = document.getElementById('persistSettings');
        const autoExport = document.getElementById('autoExport');
        const tempAlertThreshold = document.getElementById('tempAlertThreshold');
        const clearStorageBtn = document.getElementById('clearStorageBtn');
        
        if (enableNotifications) {
            enableNotifications.onchange = (e) => {
                this.settings.enableNotifications = e.target.checked;
                this.saveSettings();
                if (e.target.checked) {
                    DashboardUtils.showNotification('Notifications enabled', {
                        body: 'You will receive alerts for important mining events'
                    });
                }
            };
        }
        
        if (persistSettings) {
            persistSettings.onchange = (e) => {
                this.settings.persistSettings = e.target.checked;
                this.saveSettings();
            };
        }
        
        if (autoExport) {
            autoExport.onchange = (e) => {
                this.settings.autoExport = e.target.checked;
                this.saveSettings();
                if (e.target.checked) {
                    this.startAutoExport();
                } else {
                    this.stopAutoExport();
                }
            };
        }
        
        if (tempAlertThreshold) {
            tempAlertThreshold.onchange = (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                    this.settings.tempAlertThreshold = value;
                    this.saveSettings();
                }
            };
        }

        // Currency selector
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect) {
            currencySelect.onchange = (e) => {
                this.settings.displayCurrency = e.target.value;
                this.saveSettings();
                this.updateCurrencyDisplay();
            };
        }
        
        if (clearStorageBtn) {
            clearStorageBtn.onclick = () => {
                if (confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
                    DashboardUtils.clearStorage();
                    this.addLog('All saved data cleared', 'info');
                    this.loadSettings();
                    this.loadSettingsUI();
                }
            };
        }
    }
    
    /**
     * Export mining data
     */
    exportMiningData() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                miningData: {
                    hashRate: this.miningData.hashRate,
                    acceptedShares: this.miningData.acceptedShares,
                    rejectedShares: this.miningData.rejectedShares,
                    shareRate: this.miningData.shareRate,
                    powerUsage: this.miningData.powerUsage,
                    efficiency: this.miningData.efficiency,
                    uptime: Date.now() - this.startTime,
                    isMining: this.miningData.isMining
                },
                gpus: this.miningData.gpus.map(gpu => ({
                    name: gpu.name,
                    hashRate: gpu.hashRate,
                    temperature: gpu.temperature,
                    fanSpeed: gpu.fanSpeed,
                    powerUsage: gpu.powerUsage,
                    memoryTemp: gpu.memoryTemp
                })),
                network: {
                    nodeSynced: this.miningData.network.nodeSynced,
                    currentChain: this.miningData.network.currentChain,
                    blockHeight: this.miningData.network.blockHeight,
                    difficulty: this.miningData.network.difficulty,
                    peerCount: this.miningData.network.peerCount
                },
                rewards: {
                    quaiEarnings: this.miningData.rewards.quaiEarnings,
                    qiEarnings: this.miningData.rewards.qiEarnings,
                    blocksFound: this.miningData.rewards.blocksFound
                },
                history: {
                    hashRate: this.hashRateHistory.slice(-100), // Last 100 points
                    temperature: this.temperatureHistory.slice(-100)
                }
            };
            
            // Show export menu
            const format = prompt('Export format:\n1. JSON (recommended)\n2. CSV\n\nEnter 1 or 2:', '1');
            
            if (format === '1' || format === '') {
                DashboardUtils.exportData(exportData, 'json');
                this.addLog('Data exported as JSON', 'success');
            } else if (format === '2') {
                // Convert to CSV format
                const csvData = this.hashRateHistory.map((point, index) => ({
                    timestamp: point.time,
                    hashRate: point.value,
                    temperature: this.temperatureHistory[index]?.value || 0,
                    acceptedShares: this.miningData.acceptedShares,
                    rejectedShares: this.miningData.rejectedShares,
                    powerUsage: this.miningData.powerUsage
                }));
                DashboardUtils.exportData(csvData, 'csv');
                this.addLog('Data exported as CSV', 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.addLog(`Export failed: ${error.message}`, 'error');
        }
    }
    
    /**
     * Settings management
     */
    settings = {
        enableNotifications: false,
        persistSettings: true,
        autoExport: false,
        tempAlertThreshold: 80,
        displayCurrency: 'QUAI' // Default currency
    };
    
    autoExportInterval = null;
    
    loadSettings() {
        if (typeof DashboardUtils !== 'undefined') {
            const saved = DashboardUtils.loadFromStorage('settings', null);
            if (saved) {
                this.settings = { ...this.settings, ...saved };
            }
        }
    }
    
    saveSettings() {
        if (this.settings.persistSettings && typeof DashboardUtils !== 'undefined') {
            DashboardUtils.saveToStorage('settings', this.settings);
        }
    }
    
    loadSettingsUI() {
        const enableNotifications = document.getElementById('enableNotifications');
        const persistSettings = document.getElementById('persistSettings');
        const autoExport = document.getElementById('autoExport');
        const tempAlertThreshold = document.getElementById('tempAlertThreshold');
        const currencySelect = document.getElementById('currencySelect');
        
        if (enableNotifications) enableNotifications.checked = this.settings.enableNotifications;
        if (persistSettings) persistSettings.checked = this.settings.persistSettings;
        if (autoExport) autoExport.checked = this.settings.autoExport;
        if (tempAlertThreshold) tempAlertThreshold.value = this.settings.tempAlertThreshold;
        if (currencySelect) currencySelect.value = this.settings.displayCurrency || 'QUAI';
    }
    
    startAutoExport() {
        if (this.autoExportInterval) {
            clearInterval(this.autoExportInterval);
        }
        
        // Export every hour
        this.autoExportInterval = setInterval(() => {
            this.exportMiningData();
        }, 3600000); // 1 hour
        
        this.addLog('Auto-export enabled (every hour)', 'info');
    }
    
    stopAutoExport() {
        if (this.autoExportInterval) {
            clearInterval(this.autoExportInterval);
            this.autoExportInterval = null;
        }
        this.addLog('Auto-export disabled', 'info');
    }
    
    /**
     * Check temperature alerts
     */
    checkTemperatureAlerts() {
        if (!this.settings.enableNotifications) return;
        
        this.miningData.gpus.forEach(gpu => {
            if (gpu.temperature >= this.settings.tempAlertThreshold) {
                DashboardUtils.showNotification('High GPU Temperature Alert', {
                    body: `${gpu.name} temperature is ${gpu.temperature.toFixed(1)}°C`,
                    tag: `temp-alert-${gpu.id}`,
                    requireInteraction: true
                });
            }
        });
    }

    // Test node connection manually - tries multiple ports and IPs
    async testNodeConnection() {
        const statusEl = document.getElementById('nodeConnectionStatus');
        const testBtn = document.getElementById('testNodeConnection');
        
        if (testBtn) testBtn.disabled = true;
        if (statusEl) {
            statusEl.textContent = 'Testing connection...';
            statusEl.className = '';
        }

        // Try multiple common RPC ports and IPs
        const portsToTry = [8545, 8546, 8547, 8548];
        const hostsToTry = [
            'localhost',      // Node likely on same machine as Grafana (localhost:3000)
            '127.0.0.1',     // Alternative localhost
            '192.168.2.110'  // If node is on same machine as stratum proxy
        ];
        
        let connected = false;
        let triedUrls = [];

        // Try each host with each port
        for (const host of hostsToTry) {
            for (const port of portsToTry) {
                const testUrl = `http://${host}:${port}`;
                triedUrls.push(testUrl);
                this.addLog(`Trying node RPC at ${testUrl}...`, 'info');
                
                try {
                    const originalUrl = CONFIG.node.rpcUrl;
                    CONFIG.node.rpcUrl = testUrl; // Temporarily change URL
                    
                    const result = await this.rpcCall('eth_blockNumber', []);
                    
                    if (result && result.result && !result.error) {
                        const blockNum = parseInt(result.result, 16);
                        
                        // Update config with working URL
                        CONFIG.node.rpcUrl = testUrl;
                        
                        if (statusEl) {
                            statusEl.textContent = `✓ Connected! Block: ${blockNum.toLocaleString()} (${testUrl})`;
                            statusEl.className = 'success';
                        }
                        this.addLog(`✓ Node connection successful at ${testUrl}. Block: ${blockNum}`, 'success');
                        
                        // If connection works, start metrics if not already running
                        if (CONFIG.node.enableMetrics && !this.nodeMetricsInterval) {
                            this.startNodeMetrics();
                        }
                        
                        connected = true;
                        break;
                    }
                } catch (error) {
                    // Try next combination
                    continue;
                }
            }
            if (connected) break;
        }

        if (!connected) {
            if (statusEl) {
                statusEl.textContent = `✗ Connection failed. Check node RPC settings.`;
                statusEl.className = 'error';
            }
            this.addLog(`Node connection failed. Tried ${triedUrls.length} combinations.`, 'error');
            this.addLog(`Tried: ${triedUrls.slice(0, 6).join(', ')}${triedUrls.length > 6 ? '...' : ''}`, 'info');
            this.addLog(`Troubleshooting:`, 'info');
            this.addLog(`1. Check if Quai node RPC is enabled (usually --http flag)`, 'info');
            this.addLog(`2. Verify RPC port (check node startup logs)`, 'info');
            this.addLog(`3. Check firewall settings`, 'info');
            this.addLog(`4. If node is on different machine, update rpcUrl in config.js`, 'info');
            this.addLog(`Note: Grafana (port 3000) is separate from node RPC`, 'info');
        }

        if (testBtn) testBtn.disabled = false;
    }

    /**
     * Pelagus Wallet Integration
     * Official Source: https://github.com/dominant-strategies/pelagus
     * Documentation: https://pelaguswallet.io/docs
     * Website: https://pelaguswallet.io
     * 
     * Implements window.pelagus detection and connection following official Pelagus patterns
     */
    initManualAddressInput() {
        const addressInput = document.getElementById('manualAddressInput');
        const fetchBtn = document.getElementById('fetchAddressBtn');
        
        if (!addressInput || !fetchBtn) {
            console.warn('Manual address input elements not found');
            return;
        }
        
        // Handle Enter key in input field
        addressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchBtn.click();
            }
        });
        
        // Handle fetch button click
        fetchBtn.addEventListener('click', async () => {
            const address = addressInput.value.trim();
            
            if (!address) {
                this.addLog('Please enter a Quai address', 'warning');
                addressInput.focus();
                return;
            }
            
            // Validate address format (basic check - should start with 0x and be 42 chars)
            if (!address.startsWith('0x') || address.length !== 42) {
                this.addLog('Invalid address format. Quai addresses should start with 0x and be 42 characters long.', 'error');
                addressInput.focus();
                return;
            }
            
            // Fetch coinbase transactions for this address
            this.addLog(`Fetching coinbase transactions for address: ${address.substring(0, 10)}...`, 'info');
            await this.fetchCoinbaseTransactions(address);
        });
        
        this.addLog('Manual address input initialized. Enter a Quai address to fetch coinbase transactions.', 'info');
    }

    initPelagusWallet() {
        const connectBtn = document.getElementById('connectWalletBtn');
        
        // Log what's available for debugging
        this.logAvailableProviders();
        
        // Try multiple detection methods with more retries
        this.detectPelagusProvider(connectBtn);
    }

    logAvailableProviders() {
        const providers = {
            'window.pelagus': typeof window.pelagus !== 'undefined' ? 'available' : 'undefined',
            'window.ethereum': typeof window.ethereum !== 'undefined' ? 'available' : 'undefined',
            'window.ethereum.isPelagus': window.ethereum?.isPelagus || false,
            'window.ethereum.providers': window.ethereum?.providers?.length || 0
        };
        console.log('Available wallet providers:', providers);
        this.addLog(`Wallet detection: pelagus=${providers['window.pelagus']}, ethereum=${providers['window.ethereum']}`, 'info');
    }

    detectPelagusProvider(connectBtn, retryCount = 0) {
        // Official Pelagus detection method per documentation
        // Priority: window.pelagus > window.ethereum with isPelagus > providers array
        let pelagusProvider = null;
        
        // Method 1: Direct window.pelagus (Primary method per Pelagus docs)
        if (window.pelagus && typeof window.pelagus.request === 'function') {
            pelagusProvider = window.pelagus;
            this.addLog('✓ Pelagus detected via window.pelagus', 'success');
        }
        // Method 2: window.ethereum with Pelagus identifier (per official docs)
        else if (window.ethereum) {
            // Check if window.ethereum itself is Pelagus
            if (window.ethereum.isPelagus) {
                pelagusProvider = window.ethereum;
                this.addLog('✓ Pelagus detected via window.ethereum.isPelagus', 'success');
            }
            // Check providers array for Pelagus (per official docs)
            else if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
                const pelagus = window.ethereum.providers.find(p => p.isPelagus);
                if (pelagus) {
                    pelagusProvider = pelagus;
                    this.addLog('✓ Pelagus detected in providers array', 'success');
                }
            }
        }

        if (pelagusProvider) {
            this.setupPelagusConnection(pelagusProvider);
            return;
        }

        // If not found and we haven't retried too many times, wait and retry
        // Increased retries to 30 (15 seconds total) to give extension more time to inject
        if (retryCount < 30) {
            if (retryCount % 5 === 0) {
                this.addLog(`Waiting for Pelagus extension... (attempt ${retryCount + 1}/30)`, 'info');
            }
            setTimeout(() => {
                this.detectPelagusProvider(connectBtn, retryCount + 1);
            }, 500);
        } else {
            // Final attempt - show connect button that will try to find provider
            connectBtn.innerHTML = '<span class="wallet-icon">🔗</span> Connect Pelagus';
            connectBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Comprehensive check for Pelagus (following official docs)
                let finalCheck = null;
                
                // Priority 1: window.pelagus (primary method)
                if (window.pelagus && typeof window.pelagus.request === 'function') {
                    finalCheck = window.pelagus;
                    this.addLog('Found window.pelagus!', 'success');
                }
                // Priority 2: window.ethereum with isPelagus identifier (per official docs)
                else if (window.ethereum) {
                    if (window.ethereum.isPelagus) {
                        finalCheck = window.ethereum;
                        this.addLog('Found Pelagus via window.ethereum.isPelagus', 'success');
                    } 
                    // Priority 3: Check providers array (per official docs)
                    else if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
                        const pelagus = window.ethereum.providers.find(p => p.isPelagus);
                        if (pelagus) {
                            finalCheck = pelagus;
                            this.addLog('Found Pelagus in providers array', 'success');
                        }
                    }
                }
                
                // Debug logging
                console.log('Pelagus connection attempt:', {
                    'window.pelagus': typeof window.pelagus,
                    'window.ethereum': typeof window.ethereum,
                    'ethereum.isPelagus': window.ethereum?.isPelagus,
                    'ethereum.providers': window.ethereum?.providers?.length,
                    'found': !!finalCheck,
                    'all window keys': Object.keys(window).filter(k => 
                        k.toLowerCase().includes('pelagus') || 
                        k.toLowerCase().includes('ethereum') ||
                        k.toLowerCase().includes('web3')
                    )
                });
                
                if (finalCheck) {
                    this.setupPelagusConnection(finalCheck);
                    setTimeout(() => this.connectPelagus(), 100);
                } else {
                    this.addLog('Pelagus still not detected. Troubleshooting:', 'warning');
                    this.addLog('1. Ensure extension is enabled: chrome://extensions/', 'info');
                    this.addLog('2. Try refreshing this page (F5)', 'info');
                    this.addLog('3. Check browser console (F12) for details', 'info');
                    this.addLog('4. Make sure Pelagus is unlocked', 'info');
                    this.addLog('5. Try disabling other wallet extensions temporarily', 'info');
                    
                    // Show install link if truly not found
                    if (!window.ethereum && !window.pelagus) {
                        connectBtn.innerHTML = '<span class="wallet-icon">🔗</span> Install Pelagus';
                        connectBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open('https://pelaguswallet.io', '_blank');
                            this.addLog('Opening Pelagus wallet installation page...', 'info');
                        };
                    }
                }
            };
            
            this.addLog('Pelagus not auto-detected. Click "Connect Pelagus" to try manual connection.', 'warning');
            this.addLog('If Pelagus is installed and unlocked, try refreshing the page.', 'info');
            
            // Show refresh detection button
            const refreshBtn = document.getElementById('refreshDetectionBtn');
            if (refreshBtn) {
                refreshBtn.style.display = 'flex';
                refreshBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.addLog('Retrying Pelagus detection...', 'info');
                    this.logAvailableProviders();
                    this.detectPelagusProvider(connectBtn, 0); // Restart detection
                };
            }
        }
    }

    setupPelagusConnection(pelagusProvider) {
        const connectBtn = document.getElementById('connectWalletBtn');
        
        // Store provider reference
        this.pelagusProvider = pelagusProvider;
        
        this.addLog('Pelagus wallet detected!', 'success');
        
        // Update button
        connectBtn.innerHTML = '<span class="wallet-icon">🔗</span> Connect Pelagus';
        connectBtn.disabled = false;
        
        // Check if already connected
        this.checkPelagusConnection();

        // Connect button handler
        connectBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.connectPelagus();
        };

        // Listen for account changes (per Pelagus docs: window.pelagus.on)
        // Try window.pelagus first, then provider
        const eventProvider = window.pelagus || pelagusProvider;
        
        if (eventProvider && typeof eventProvider.on === 'function') {
            // Use Pelagus event system (per official docs)
            eventProvider.on('accountsChanged', (accounts) => {
                this.handleAccountsChanged(accounts);
            });

            eventProvider.on('chainChanged', (chainId) => {
                this.handleChainChanged(chainId);
            });
            
            this.addLog('Event listeners registered', 'info');
        } else if (pelagusProvider.addEventListener) {
            // Alternative event listener method
            pelagusProvider.addEventListener('accountsChanged', (accounts) => {
                this.handleAccountsChanged(accounts);
            });
            this.addLog('Event listeners registered (addEventListener)', 'info');
        } else {
            this.addLog('Warning: Could not register event listeners', 'warning');
        }
    }

    async checkPelagusConnection() {
        if (!this.pelagusProvider) return;
        
        try {
            // Try Quai-specific method first
            const accounts = await this.pelagusProvider.request({ method: 'quai_accounts' });
            if (accounts && accounts.length > 0) {
                this.handleWalletConnected(accounts[0]);
                return;
            }
        } catch (error) {
            // Try standard Ethereum method as fallback
            try {
                const accounts = await this.pelagusProvider.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    this.handleWalletConnected(accounts[0]);
                }
            } catch (err) {
                // Not connected
                console.log('Pelagus not connected');
            }
        }
    }

    async connectPelagus() {
        // Try to find provider again if not set (following official Pelagus detection)
        if (!this.pelagusProvider) {
            // Official Pelagus detection method
            const pelagusProvider = window.pelagus || 
                (window.ethereum?.isPelagus ? window.ethereum : null) ||
                (window.ethereum?.providers?.find(p => p.isPelagus));
            
            if (pelagusProvider) {
                this.pelagusProvider = pelagusProvider;
                this.setupPelagusConnection(pelagusProvider);
                this.addLog('Pelagus provider found and configured', 'info');
            } else {
                this.addLog('No wallet provider found. window.pelagus and window.ethereum are not available.', 'error');
                this.addLog('Please ensure Pelagus extension is installed and enabled in Chrome.', 'info');
                this.addLog('Install Pelagus: https://pelaguswallet.io', 'info');
                this.addLog('Check: chrome://extensions/ - make sure Pelagus is enabled', 'info');
                this.addLog('After enabling, refresh this page (F5)', 'info');
                
                // Update button to link to Pelagus installation
                const connectBtn = document.getElementById('connectWalletBtn');
                if (connectBtn) {
                    connectBtn.innerHTML = '<span class="wallet-icon">🔗</span> Install Pelagus';
                    connectBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open('https://pelaguswallet.io', '_blank');
                        this.addLog('Opening Pelagus wallet installation page...', 'info');
                    };
                }
                return;
            }
        }

        const connectBtn = document.getElementById('connectWalletBtn');
        
        try {
            connectBtn.disabled = true;
            connectBtn.innerHTML = '<span class="wallet-icon">⏳</span> Connecting...';
            
            // Request account access - try Pelagus methods first (per official docs)
            let accounts;
            const methods = [
                'quai_requestAccounts',  // Primary Pelagus method
                'quai_accounts',         // Check existing connection
                'eth_requestAccounts',   // Fallback
                'eth_accounts'           // Fallback check
            ];
            
            for (const method of methods) {
                try {
                    this.addLog(`Trying connection method: ${method}`, 'info');
                    accounts = await this.pelagusProvider.request({ method: method });
                    if (accounts && accounts.length > 0) {
                        this.addLog(`✓ Connected using ${method}`, 'success');
                        break;
                    }
                } catch (error) {
                    // Log error but continue to next method
                    if (error.code !== 4001) { // Don't log user rejection
                        console.log(`Method ${method} failed:`, error.message);
                    }
                    continue;
                }
            }

            if (accounts && accounts.length > 0) {
                this.handleWalletConnected(accounts[0]);
                this.addLog('✓ Pelagus wallet connected successfully', 'success');
            } else {
                throw new Error('No accounts returned. User may need to approve connection in Pelagus.');
            }
        } catch (error) {
            console.error('Pelagus connection error:', error);
            
            if (error.code === 4001) {
                this.addLog('Connection rejected by user', 'warning');
                this.addLog('Click "Connect Pelagus" again to retry', 'info');
            } else if (error.message.includes('not found') || error.message.includes('undefined')) {
                this.addLog('Pelagus extension may not be fully loaded.', 'warning');
                this.addLog('Try: 1) Refresh page (F5), 2) Unlock Pelagus, 3) Check extension is enabled', 'info');
            } else {
                this.addLog(`Connection failed: ${error.message}`, 'error');
                this.addLog('Make sure Pelagus is unlocked and try again', 'info');
            }
            
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<span class="wallet-icon">🔗</span> Connect Pelagus';
        }
    }

    async handleWalletConnected(address) {
        const connectBtn = document.getElementById('connectWalletBtn');
        const walletInfo = document.getElementById('walletInfo');
        const walletAddress = document.getElementById('walletAddress');
        const walletBalance = document.getElementById('walletBalance');

        // Update UI
        connectBtn.classList.add('connected');
        connectBtn.innerHTML = '<span class="wallet-icon">✓</span> Connected';
        connectBtn.disabled = false;
        
        walletInfo.style.display = 'flex';
        walletAddress.textContent = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        walletAddress.title = address; // Show full address on hover

        // Get balance (simplified - just for display)
        try {
            let balance;
            try {
                balance = await this.pelagusProvider.request({
                    method: 'quai_getBalance',
                    params: [address, 'latest']
                });
            } catch (error) {
                balance = await this.pelagusProvider.request({
                    method: 'eth_getBalance',
                    params: [address, 'latest']
                });
            }
            const balanceInQuai = parseInt(balance, 16) / Math.pow(10, 18);
            walletBalance.textContent = `${balanceInQuai.toFixed(4)} QUAI`;
        } catch (error) {
            console.error('Error fetching balance:', error);
            walletBalance.textContent = 'Balance unavailable';
        }

        // Store connected address (mining address)
        this.connectedWallet = address;
        this.addLog(`Mining address connected: ${address}`, 'success');

        // Initialize transaction tabs
        this.initTransactionTabs();

        // Fetch coinbase transaction history for this mining address
        this.addLog('Fetching coinbase transaction history...', 'info');
        this.fetchCoinbaseTransactions(address);
        
        // Fetch QuaiScan address info for this address
        if (CONFIG.quaiscan && CONFIG.quaiscan.enabled && CONFIG.quaiscan.features.addressInfo) {
            this.addLog('Fetching QuaiScan address information...', 'info');
            this.fetchQuaiScanAddressInfo(address);
        }
        
        // Update QuaiScan links immediately when wallet connects
        this.updateQuaiScanLinks(address);
    }
    
    // Update QuaiScan links to use wallet address
    updateQuaiScanLinks(address) {
        if (!address) return;
        
        const quaiscanLink = document.getElementById('quaiscanLink');
        const quaiscanMetricsLink = document.getElementById('quaiscanMetricsLink');
        const baseUrl = CONFIG.network.networkType === 'testnet' 
            ? 'https://cyprus1.colosseum.quaiscan.io' 
            : 'https://quaiscan.io';
        
        if (quaiscanLink) {
            quaiscanLink.href = `${baseUrl}/address/${address}`;
            quaiscanLink.textContent = `View ${address.substring(0, 8)}... on QuaiScan →`;
        }
        
        if (quaiscanMetricsLink) {
            quaiscanMetricsLink.href = `${baseUrl}/address/${address}`;
            quaiscanMetricsLink.textContent = `View ${address.substring(0, 8)}... on QuaiScan →`;
        }
    }

    // Initialize transaction history tabs
    initTransactionTabs() {
        const tabs = document.querySelectorAll('.tx-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Filter transactions
                const filter = tab.getAttribute('data-tab');
                this.filterTransactions(filter);
            });
        });
    }

    // Filter transactions by type
    filterTransactions(filter) {
        const txEntries = document.querySelectorAll('.tx-entry');
        txEntries.forEach(entry => {
            const isLocked = entry.classList.contains('tx-locked');
            const isUnlocked = entry.classList.contains('tx-unlocked');
            const isCoinbase = entry.classList.contains('tx-coinbase');

            let show = false;
            if (filter === 'all') {
                show = true;
            } else if (filter === 'locked' && isLocked) {
                show = true;
            } else if (filter === 'coinbase' && isCoinbase && !isLocked) {
                show = true;
            }

            entry.style.display = show ? 'flex' : 'none';
        });
    }

    handleAccountsChanged(accounts) {
        if (accounts && accounts.length > 0) {
            this.handleWalletConnected(accounts[0]);
            this.addLog('Wallet account changed', 'info');
        } else {
            this.handleWalletDisconnected();
        }
    }

    handleChainChanged(chainId) {
        this.addLog(`Network changed: ${chainId}`, 'info');
        // Refresh balance on chain change
        if (this.connectedWallet) {
            this.handleWalletConnected(this.connectedWallet);
        }
    }

    handleWalletDisconnected() {
        const connectBtn = document.getElementById('connectWalletBtn');
        const walletInfo = document.getElementById('walletInfo');
        const txHistorySection = document.getElementById('txHistorySection');

        connectBtn.classList.remove('connected');
        connectBtn.innerHTML = '<span class="wallet-icon">🔗</span> Connect Pelagus';
        walletInfo.style.display = 'none';
        this.connectedWallet = null;
        
        // Hide transaction history
        if (txHistorySection) {
            txHistorySection.style.display = 'none';
        }
        
        this.addLog('Wallet disconnected', 'warning');
    }

    /**
     * Currency conversion and display functions
     */
    convertCurrency(amount, fromCurrency = 'QUAI', toCurrency = null) {
        // Handle invalid amounts
        if (amount === null || amount === undefined || isNaN(amount)) {
            return 0;
        }
        
        amount = parseFloat(amount);
        if (isNaN(amount) || !isFinite(amount)) {
            return 0;
        }
        
        if (!toCurrency) {
            toCurrency = this.settings?.displayCurrency || 'QUAI';
        }
        
        if (fromCurrency === toCurrency) {
            return amount;
        }
        
        // Get exchange rates from config
        if (!CONFIG.currencies || !CONFIG.currencies.exchangeRates) {
            return amount; // Return original if no rates available
        }
        
        const rates = CONFIG.currencies.exchangeRates;
        const fromRate = rates[fromCurrency] || 1.0;
        const toRate = rates[toCurrency] || 1.0;
        
        // Convert: amount * (toRate / fromRate)
        if (fromRate === 0 || isNaN(fromRate) || isNaN(toRate)) {
            return amount; // Return original if rates invalid
        }
        
        const converted = amount * (toRate / fromRate);
        return isNaN(converted) || !isFinite(converted) ? amount : converted;
    }

    formatCurrency(amount, currency = null) {
        // Handle invalid amounts
        if (amount === null || amount === undefined || isNaN(amount)) {
            amount = 0;
        }
        
        if (!currency) {
            currency = this.settings?.displayCurrency || 'QUAI';
        }
        
        // Ensure CONFIG.currencies exists
        if (!CONFIG.currencies || !CONFIG.currencies.available) {
            return `${parseFloat(amount).toFixed(6)} QUAI`;
        }
        
        const currencyInfo = CONFIG.currencies.available.find(c => c.code === currency);
        if (!currencyInfo) {
            return `${parseFloat(amount).toFixed(6)} QUAI`;
        }
        
        const converted = this.convertCurrency(amount, 'QUAI', currency);
        const symbol = currencyInfo.symbol || currency;
        const decimals = currencyInfo.decimals || 6;
        
        // Handle NaN or invalid converted values
        if (isNaN(converted) || !isFinite(converted)) {
            return `${parseFloat(amount).toFixed(decimals)} ${symbol}`;
        }
        
        if (currency === 'QUAI') {
            return `${converted.toFixed(decimals)} ${symbol}`;
        } else {
            return `${symbol}${converted.toFixed(decimals)}`;
        }
    }

    updateCurrencyDisplay() {
        // Update all currency displays
        this.updateUI();
        
        // Update transaction history if we have data
        if (this.connectedWallet) {
            // Refresh transaction history with new currency
            this.fetchCoinbaseTransactions(this.connectedWallet);
            this.updateWalletBalance();
        }
    }

    /**
     * Initialize tooltips for info icons
     */
    initTooltips() {
        // Tooltips are handled via CSS :hover pseudo-elements
        // This function can be used for additional tooltip functionality if needed
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            // Add accessibility attributes
            element.setAttribute('aria-label', element.getAttribute('data-tooltip'));
            element.setAttribute('role', 'tooltip');
        });
    }

    // Fetch coinbase transactions for mining address
    async fetchCoinbaseTransactions(address) {
        if (!CONFIG.node.rpcUrl || !address) {
            this.addLog('Cannot fetch coinbase transactions: Node RPC URL or address missing', 'error');
            return;
        }

        const txHistorySection = document.getElementById('txHistorySection');
        const txHistoryContainer = document.getElementById('txHistoryContainer');
        
        if (!txHistorySection || !txHistoryContainer) {
            this.addLog('Transaction history section not found', 'error');
            return;
        }

        try {
            txHistoryContainer.innerHTML = '<div class="tx-history-placeholder">Loading coinbase transaction history for mining address...</div>';
            txHistorySection.style.display = 'block';

            // Get current block number
            const blockNumberResponse = await this.rpcCall('eth_blockNumber', []);
            if (!blockNumberResponse || !blockNumberResponse.result) {
                throw new Error('Could not fetch block number. Check node connection.');
            }

            const currentBlock = parseInt(blockNumberResponse.result, 16);
            const startBlock = Math.max(0, currentBlock - 10000); // Check last 10k blocks

            this.addLog(`Fetching coinbase transactions for address ${address.substring(0, 10)}... from block ${startBlock} to ${currentBlock}`, 'info');

            // Fetch transactions from blocks
            const allRewards = [];
            let totalRewards = 0;
            let totalLocked = 0;
            let totalUnlocked = 0;

            // Check blocks in batches
            const batchSize = 100;
            for (let blockNum = currentBlock; blockNum >= startBlock && allRewards.length < 100; blockNum -= batchSize) {
                const endBlock = Math.max(startBlock, blockNum - batchSize);
                
                // Fetch blocks in parallel
                const blockPromises = [];
                for (let b = blockNum; b > endBlock; b--) {
                    blockPromises.push(this.rpcCall('eth_getBlockByNumber', [`0x${b.toString(16)}`, true]));
                }

                const blocks = await Promise.all(blockPromises);

                for (const blockResponse of blocks) {
                    if (!blockResponse || !blockResponse.result) continue;
                    
                    const block = blockResponse.result;
                    const blockNumber = parseInt(block.number, 16);
                    const blockTime = parseInt(block.timestamp, 16) * 1000;

                    if (block.transactions && block.transactions.length > 0) {
                        // Check coinbase transaction (first transaction in block, from address is 0x0 or null)
                        const coinbaseTx = block.transactions.find(tx => {
                            const from = tx.from || '';
                            return (from === '0x0' || from === '0x' || from === '' || !from) && 
                                   tx.to && tx.to.toLowerCase() === address.toLowerCase();
                        });

                        if (coinbaseTx) {
                            const value = parseInt(coinbaseTx.value, 16) / Math.pow(10, 18); // Convert to QUAI
                            totalRewards += value;

                            // Check if this is a locked mining reward (LMR)
                            // LMR transactions typically have specific characteristics or are in special contracts
                            const isLocked = await this.checkIfLockedReward(coinbaseTx, blockNumber);
                            
                            if (isLocked) {
                                totalLocked += value;
                            } else {
                                totalUnlocked += value;
                            }

                            allRewards.push({
                                hash: coinbaseTx.hash,
                                blockNumber: blockNumber,
                                value: value,
                                timestamp: blockTime,
                                date: new Date(blockTime),
                                isLocked: isLocked,
                                type: isLocked ? 'locked' : 'coinbase'
                            });
                        }

                        // Also check for LMR unlock transactions (when locked rewards are unlocked)
                        const unlockTxs = block.transactions.filter(tx => {
                            // Check if transaction is related to unlocking LMR
                            // This might involve checking contract interactions or specific transaction patterns
                            return tx.to && tx.to.toLowerCase() === address.toLowerCase() &&
                                   tx.input && tx.input !== '0x' && 
                                   this.isUnlockTransaction(tx);
                        });

                        for (const unlockTx of unlockTxs) {
                            const value = parseInt(unlockTx.value, 16) / Math.pow(10, 18);
                            totalUnlocked += value;
                            totalLocked -= value; // Subtract from locked when unlocked

                            allRewards.push({
                                hash: unlockTx.hash,
                                blockNumber: blockNumber,
                                value: value,
                                timestamp: blockTime,
                                date: new Date(blockTime),
                                isLocked: false,
                                isUnlock: true,
                                type: 'unlocked'
                            });
                        }
                    }
                }

                // Update UI with progress
                if (allRewards.length > 0) {
                    this.updateTransactionHistory(allRewards, totalRewards, totalLocked, totalUnlocked);
                }
            }

            if (allRewards.length === 0) {
                txHistoryContainer.innerHTML = `
                    <div class="tx-history-placeholder">
                        <p>No coinbase transactions found for this mining address.</p>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px;">
                            Searched blocks ${startBlock} to ${currentBlock}. 
                            If you just started mining, transactions will appear as blocks are found.
                        </p>
                    </div>
                `;
                // Update stats to show zeros
                this.updateTransactionHistory([], 0, 0, 0);
            } else {
                this.addLog(`Found ${allRewards.length} coinbase transaction(s) for mining address`, 'success');
            }

        } catch (error) {
            console.error('Error fetching mining rewards:', error);
            txHistoryContainer.innerHTML = `<div class="tx-history-placeholder">Error loading transactions: ${error.message}</div>`;
            this.addLog(`Error fetching mining rewards: ${error.message}`, 'error');
        }
    }

    // Check if a transaction is a locked mining reward (LMR)
    async checkIfLockedReward(tx, blockNumber) {
        // LMR detection logic:
        // 1. Check if transaction has specific contract interaction
        // 2. Check transaction input data for LMR indicators
        // 3. Check if value matches locked reward patterns
        
        // For Quai Network, locked rewards might be identified by:
        // - Specific contract addresses
        // - Transaction input data patterns
        // - Block characteristics
        
        // Check transaction input for LMR indicators
        if (tx.input && tx.input !== '0x') {
            // LMR transactions often have specific function signatures
            // Common patterns: lock, stake, or contract interactions
            const input = tx.input.toLowerCase();
            if (input.includes('lock') || input.includes('stake') || input.length > 138) {
                return true;
            }
        }

        // Check if transaction is to a known LMR contract (if available)
        // This would require knowing Quai's LMR contract addresses
        
        return false; // Default to false if not clearly identified
    }

    // Check if transaction is an unlock transaction
    isUnlockTransaction(tx) {
        if (!tx.input || tx.input === '0x') return false;
        
        const input = tx.input.toLowerCase();
        // Common unlock function signatures
        return input.includes('unlock') || input.includes('withdraw') || input.includes('release');
    }

    // Update transaction history display
    updateTransactionHistory(transactions, totalRewards, totalLocked, totalUnlocked) {
        const txHistoryContainer = document.getElementById('txHistoryContainer');
        const totalRewardsEl = document.getElementById('totalCoinbaseRewards');
        const totalLockedEl = document.getElementById('totalLockedRewards');
        const totalUnlockedEl = document.getElementById('totalUnlockedRewards');
        const txCountEl = document.getElementById('coinbaseTxCount');

        if (!txHistoryContainer) return;

        // Sort by block number (newest first)
        transactions.sort((a, b) => b.blockNumber - a.blockNumber);

        // Update stats with currency conversion
        if (totalRewardsEl) {
            totalRewardsEl.textContent = this.formatCurrency(totalRewards);
        }
        if (totalLockedEl) {
            totalLockedEl.textContent = this.formatCurrency(Math.max(0, totalLocked));
        }
        if (totalUnlockedEl) {
            totalUnlockedEl.textContent = this.formatCurrency(Math.max(0, totalUnlocked));
        }
        if (txCountEl) {
            txCountEl.textContent = transactions.length.toString();
        }

        // Render transactions
        txHistoryContainer.innerHTML = transactions.map(tx => {
            const timeAgo = this.getTimeAgo(tx.timestamp);
            let badgeClass = 'tx-badge';
            let badgeText = 'Coinbase';
            let entryClass = 'tx-entry tx-coinbase';

            if (tx.isUnlock) {
                badgeClass += ' unlocked';
                badgeText = 'Unlocked';
                entryClass += ' tx-unlocked';
            } else if (tx.isLocked) {
                badgeClass += ' locked';
                badgeText = 'Locked (LMR)';
                entryClass += ' tx-locked';
            }

            return `
                <div class="${entryClass}">
                    <div class="tx-entry-info">
                        <div class="tx-entry-header">
                            <span class="tx-hash-short">${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 8)}</span>
                            <span class="${badgeClass}">${badgeText}</span>
                        </div>
                        <div class="tx-entry-details">
                            <span class="tx-block">Block: ${tx.blockNumber.toLocaleString()}</span>
                            <span class="tx-time">${timeAgo}</span>
                        </div>
                    </div>
                    <div class="tx-amount">+${this.formatCurrency(tx.value)}</div>
                </div>
            `;
        }).join('');
    }

    // Helper to get time ago string
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    // Update running averages
    updateRunningAverages() {
        // Add current values to running average arrays
        this.runningAverages.hashRate.push(this.miningData.hashRate);
        if (this.miningData.gpus && this.miningData.gpus.length > 0) {
            this.runningAverages.temperature.push(this.miningData.gpus[0].temperature || 0);
        }
        this.runningAverages.shareRate.push(this.miningData.shareRate);
        this.runningAverages.powerUsage.push(this.miningData.powerUsage);

        // Keep only last N samples
        Object.keys(this.runningAverages).forEach(key => {
            if (key !== 'maxSamples' && Array.isArray(this.runningAverages[key])) {
                if (this.runningAverages[key].length > this.runningAverages.maxSamples) {
                    this.runningAverages[key].shift();
                }
            }
        });
    }

    // Calculate running average for a metric
    calculateRunningAverage(metric) {
        const values = this.runningAverages[metric];
        if (!values || values.length === 0) return 0;
        
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
    }

    // QuaiScan Integration
    // Based on official QuaiScan API: https://docs.quaiscan.io
    // API Documentation: https://docs.quaiscan.io/developer-support/api
    initQuaiScan() {
        if (!CONFIG.quaiscan || !CONFIG.quaiscan.enabled) {
            this.addLog('QuaiScan integration disabled in config', 'info');
            return;
        }
        
        if (!CONFIG.quaiscan.apiUrl) {
            this.addLog('QuaiScan API URL not configured. Check CONFIG.quaiscan.apiUrl in config.js', 'warning');
            return;
        }
        
        this.addLog('Initializing QuaiScan integration (transaction data only)...', 'info');
        
        // QuaiScan section is now only for transaction history (handled in tx-history-section)
        // No separate QuaiScan section to show

        // Fetch initial transaction data if wallet is connected
        if (this.connectedWallet) {
            this.fetchQuaiScanAddressInfo(this.connectedWallet);
        }

        // Set up periodic updates
        this.quaiscanInterval = setInterval(() => {
            if (this.connectedWallet && CONFIG.quaiscan.features.addressInfo) {
                this.fetchQuaiScanAddressInfo(this.connectedWallet);
            }
        }, CONFIG.quaiscan.updateInterval);
        
        this.addLog(`QuaiScan data collection started (interval: ${CONFIG.quaiscan.updateInterval / 1000}s)`, 'info');
    }

    async fetchQuaiScanData() {
        // QuaiScan now only fetches transaction data
        if (!CONFIG.quaiscan || !CONFIG.quaiscan.enabled || !CONFIG.quaiscan.apiUrl) return;

        try {
            // Fetch address info (transaction data) if wallet is connected
            if (this.connectedWallet && CONFIG.quaiscan.features.addressInfo) {
                await this.fetchQuaiScanAddressInfo(this.connectedWallet);
            }
        } catch (error) {
            console.error('QuaiScan fetch error:', error);
            this.addLog(`QuaiScan error: ${error.message}`, 'error');
        }
    }

    // Elastic blockchain data integration
    initElastic() {
        if (!CONFIG.elastic || !CONFIG.elastic.enabled) {
            this.addLog('Elastic blockchain data integration disabled in config', 'info');
            return;
        }
        
        if (!CONFIG.elastic.apiUrl) {
            this.addLog('Elastic API URL not configured. Check CONFIG.elastic.apiUrl in config.js', 'warning');
            return;
        }
        
        this.addLog(`Initializing Elastic blockchain data integration at ${CONFIG.elastic.apiUrl}...`, 'info');
        
        // Fetch initial data
        this.fetchElasticData();

        // Set up periodic updates
        this.elasticInterval = setInterval(() => {
            this.fetchElasticData();
        }, CONFIG.elastic.updateInterval);
        
        this.addLog(`Elastic data collection started (interval: ${CONFIG.elastic.updateInterval / 1000}s)`, 'info');
    }

    async fetchElasticData() {
        if (!CONFIG.elastic || !CONFIG.elastic.enabled || !CONFIG.elastic.apiUrl) return;

        try {
            // Try Elastic API endpoints
            const endpoints = [
                `${CONFIG.elastic.apiUrl}/network/stats`,
                `${CONFIG.elastic.apiUrl}/blocks/latest`,
                `${CONFIG.elastic.apiUrl}/stats`,
                `${CONFIG.elastic.apiUrl}/_search` // Elasticsearch query endpoint
            ];

            let data = null;
            for (const endpoint of endpoints) {
                try {
                    const options = {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    };
                    
                    // If Elasticsearch endpoint, use POST with query
                    if (endpoint.includes('_search')) {
                        options.method = 'POST';
                        options.body = JSON.stringify({
                            query: {
                                match_all: {}
                            },
                            size: 1,
                            sort: [{ timestamp: { order: 'desc' } }]
                        });
                    }
                    
                    const response = await fetch(endpoint, options);
                    if (response.ok) {
                        const result = await response.json();
                        
                        // Handle Elasticsearch response
                        if (result.hits && result.hits.hits && result.hits.hits.length > 0) {
                            data = result.hits.hits[0]._source;
                            break;
                        }
                        // Handle REST response
                        if (result.network || result.blockNumber || result.number) {
                            data = result;
                            break;
                        }
                    }
                } catch (e) {
                    if (e.message.includes('CORS')) {
                        console.warn('Elastic API CORS error - may need server-side proxy');
                    }
                    continue;
                }
            }

            // Fallback: Use Prometheus or RPC if Elastic fails
            if (!data) {
                // Use Prometheus data if available
                if (this.prometheusData && this.prometheusData.lastUpdate) {
                    this.elasticData.networkHashRate = this.prometheusData.networkHashRate;
                    this.elasticData.latestBlock = this.prometheusData.blockHeight;
                    this.elasticData.blockTime = this.prometheusData.blockTime;
                    this.elasticData.difficulty = this.prometheusData.difficulty;
                    this.elasticData.lastUpdate = Date.now();
                    this.updateElasticUI();
                    return;
                }
                
                // Fallback to RPC
                const blockData = await this.rpcCall('eth_getBlockByNumber', ['latest', false]);
                if (blockData && blockData.result) {
                    const block = blockData.result;
                    const blockNumber = parseInt(block.number, 16);
                    const difficulty = block.difficulty ? parseInt(block.difficulty, 16) : 0;
                    const timestamp = parseInt(block.timestamp, 16);

                    this.elasticData.latestBlock = blockNumber;
                    this.elasticData.difficulty = difficulty;
                    
                    if (this.elasticData.lastBlockTime) {
                        const timeDiff = timestamp - this.elasticData.lastBlockTime;
                        this.elasticData.blockTime = timeDiff;
                    }
                    this.elasticData.lastBlockTime = timestamp;
                    this.elasticData.lastUpdate = Date.now();
                    this.updateElasticUI();
                    return;
                }
            }

            // Process Elastic API response
            if (data) {
                if (data.blockNumber || data.number || data.latestBlock) {
                    this.elasticData.latestBlock = parseInt(data.blockNumber || data.number || data.latestBlock, 16) || 
                                                   (data.blockNumber || data.number || data.latestBlock);
                }
                if (data.difficulty) {
                    this.elasticData.difficulty = typeof data.difficulty === 'string' 
                        ? parseInt(data.difficulty, 16) 
                        : data.difficulty;
                }
                if (data.blockTime || data.timestamp) {
                    const blockTime = data.blockTime || data.timestamp;
                    this.elasticData.blockTime = typeof blockTime === 'string' 
                        ? parseInt(blockTime, 16) 
                        : blockTime;
                }
                if (data.networkHashRate || data.hashRate || data.network?.hashRate) {
                    this.elasticData.networkHashRate = data.networkHashRate || data.hashRate || data.network?.hashRate;
                }

                this.elasticData.lastUpdate = Date.now();
                this.updateElasticUI();
            }
        } catch (error) {
            console.error('Error fetching Elastic blockchain data:', error);
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                this.addLog('Elastic API CORS error. Using Prometheus/RPC fallback.', 'warning');
            } else {
                this.addLog(`Elastic API error: ${error.message}. Using Prometheus/RPC fallback.`, 'warning');
            }
        }
    }

    updateElasticUI() {
        // Update network status with Elastic data
        if (this.elasticData.latestBlock) {
            this.miningData.network.blockHeight = this.elasticData.latestBlock;
        }
        if (this.elasticData.difficulty) {
            this.miningData.network.difficulty = this.elasticData.difficulty;
        }
        if (this.elasticData.blockTime) {
            this.miningData.network.blockTime = this.elasticData.blockTime;
        }
        if (this.elasticData.networkHashRate) {
            this.miningData.network.networkHashRate = this.elasticData.networkHashRate;
        }
        this.updateQuaiNetworkInfo();
    }

    // QuaiScan Network Metrics integration
    initQuaiScanMetrics() {
        if (!CONFIG.quaiscan || !CONFIG.quaiscan.enabled || !CONFIG.quaiscan.features.networkStats) {
            this.addLog('QuaiScan network metrics disabled in config', 'info');
            return;
        }
        
        if (!CONFIG.quaiscan.apiUrl) {
            this.addLog('QuaiScan API URL not configured. Check CONFIG.quaiscan.apiUrl in config.js', 'warning');
            return;
        }
        
        this.addLog(`Initializing QuaiScan network metrics at ${CONFIG.quaiscan.apiUrl}...`, 'info');
        
        // Show QuaiScan metrics section
        const quaiscanMetricsSection = document.getElementById('quaiscanMetricsSection');
        if (quaiscanMetricsSection) {
            quaiscanMetricsSection.style.display = 'block';
        }

        // Fetch initial data
        this.fetchQuaiScanMetrics();

        // Set up periodic updates
        this.quaiscanMetricsInterval = setInterval(() => {
            this.fetchQuaiScanMetrics();
        }, CONFIG.quaiscan.updateInterval);
        
        this.addLog(`QuaiScan network metrics collection started (interval: ${CONFIG.quaiscan.updateInterval / 1000}s)`, 'info');
    }

    async fetchQuaiScanMetrics() {
        if (!CONFIG.quaiscan || !CONFIG.quaiscan.enabled || !CONFIG.quaiscan.apiUrl || !CONFIG.quaiscan.features.networkStats) return;

        try {
            // Try QuaiScan API endpoints for network stats
            const endpoints = [
                `${CONFIG.quaiscan.apiUrl}?module=stats&action=ethsupply`,
                `${CONFIG.quaiscan.apiUrl}?module=proxy&action=eth_blockNumber`,
                `${CONFIG.quaiscan.apiUrl}/network/stats`,
                `${CONFIG.quaiscan.apiUrl}/stats`,
                `${CONFIG.quaiscan.apiUrl}/api/stats`
            ];

            let data = null;
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.result || result.data || result.totalTransactions || result.latestBlock) {
                            data = result;
                            break;
                        }
                    }
                } catch (e) {
                    if (e.message.includes('CORS')) {
                        console.warn('QuaiScan API CORS error - may need server-side proxy');
                    }
                    continue;
                }
            }

            // Also try to get latest block from RPC as fallback
            try {
                const blockNumberResponse = await this.rpcCall('eth_blockNumber', []);
                if (blockNumberResponse && !blockNumberResponse.error && blockNumberResponse.result) {
                    const blockNumber = parseInt(blockNumberResponse.result, 16);
                    if (blockNumber > 0) {
                        this.quaiscanMetricsData.latestBlock = blockNumber;
                    }
                }
            } catch (rpcError) {
                console.debug('RPC fallback for block number failed:', rpcError);
            }

            // Process QuaiScan API response
            if (data) {
                if (data.totalTransactions || data.result?.totalTransactions) {
                    this.quaiscanMetricsData.totalTransactions = parseInt(data.totalTransactions || data.result?.totalTransactions || 0);
                }
                if (data.totalAddresses || data.result?.totalAddresses) {
                    this.quaiscanMetricsData.totalAddresses = parseInt(data.totalAddresses || data.result?.totalAddresses || 0);
                }
                if (data.networkHashRate || data.result?.networkHashRate) {
                    this.quaiscanMetricsData.networkHashRate = parseFloat(data.networkHashRate || data.result?.networkHashRate || 0);
                }
                if (data.latestBlock || data.result?.latestBlock) {
                    const blockNum = data.latestBlock || data.result?.latestBlock;
                    this.quaiscanMetricsData.latestBlock = typeof blockNum === 'string' ? parseInt(blockNum, 16) : parseInt(blockNum);
                }
            }

            this.quaiscanMetricsData.lastUpdate = Date.now();
            this.updateQuaiScanMetricsUI();
        } catch (error) {
            console.error('Error fetching QuaiScan network metrics:', error);
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                this.addLog('QuaiScan API CORS error. Check API endpoint in config.', 'warning');
            } else {
                this.addLog(`QuaiScan network metrics error: ${error.message}`, 'warning');
            }
        }
    }

    updateQuaiScanMetricsUI() {
        const totalTransactionsEl = document.getElementById('quaiscanTotalTransactions');
        const totalAddressesEl = document.getElementById('quaiscanTotalAddresses');
        const networkHashRateEl = document.getElementById('quaiscanNetworkHashRate');
        const latestBlockEl = document.getElementById('quaiscanLatestBlock');
        
        // Update QuaiScan metrics link to use wallet address if available
        const quaiscanMetricsLink = document.getElementById('quaiscanMetricsLink');
        if (quaiscanMetricsLink && this.connectedWallet) {
            const baseUrl = CONFIG.network.networkType === 'testnet' 
                ? 'https://cyprus1.colosseum.quaiscan.io' 
                : 'https://quaiscan.io';
            quaiscanMetricsLink.href = `${baseUrl}/address/${this.connectedWallet}`;
            quaiscanMetricsLink.textContent = `View ${this.connectedWallet.substring(0, 8)}... on QuaiScan →`;
        }

        if (totalTransactionsEl) {
            totalTransactionsEl.textContent = this.quaiscanMetricsData.totalTransactions > 0 
                ? this.formatNumber(this.quaiscanMetricsData.totalTransactions) 
                : '-';
        }
        if (totalAddressesEl) {
            totalAddressesEl.textContent = this.quaiscanMetricsData.totalAddresses > 0 
                ? this.formatNumber(this.quaiscanMetricsData.totalAddresses) 
                : '-';
        }
        if (networkHashRateEl) {
            if (this.quaiscanMetricsData.networkHashRate > 0) {
                networkHashRateEl.textContent = this.formatHashRate(this.quaiscanMetricsData.networkHashRate);
            } else {
                // Fallback to network hash rate from other sources
                const networkHashRate = this.elasticData.networkHashRate || this.prometheusData.networkHashRate || 0;
                networkHashRateEl.textContent = networkHashRate > 0 ? this.formatHashRate(networkHashRate) : '-';
            }
        }
        if (latestBlockEl) {
            if (this.quaiscanMetricsData.latestBlock > 0) {
                latestBlockEl.textContent = this.formatNumber(this.quaiscanMetricsData.latestBlock);
            } else {
                // Fallback to block height from other sources
                const blockHeight = this.miningData.network.blockHeight || this.elasticData.latestBlock || this.prometheusData.blockHeight || 0;
                latestBlockEl.textContent = blockHeight > 0 ? this.formatNumber(blockHeight) : '-';
            }
        }
    }

    // Removed fetchQuaiScanNetworkStats - network stats now handled by Elastic blockchain data API

    async fetchQuaiScanAddressInfo(address) {
        if (!address) return;

        try {
            // Try QuaiScan API endpoints for address info (REST and GraphQL)
            const baseUrl = CONFIG.quaiscan.apiUrl.replace('/api', '');
            const endpoints = [
                // REST endpoints
                `${CONFIG.quaiscan.apiUrl}/address/${address}`,
                `${CONFIG.quaiscan.apiUrl}/accounts/${address}`,
                `${CONFIG.quaiscan.apiUrl}?module=account&action=balance&address=${address}`,
                // GraphQL endpoint
                `${baseUrl}/graphql`
            ];

            let data = null;
            for (const endpoint of endpoints) {
                try {
                    const options = {
                        method: endpoint.includes('graphql') ? 'POST' : 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    };
                    
                    // GraphQL query for address info
                    if (endpoint.includes('graphql')) {
                        options.body = JSON.stringify({
                            query: `{
                                account(address: "${address}") {
                                    balance
                                    transactionCount
                                    firstSeen
                                }
                            }`
                        });
                    }
                    
                    const response = await fetch(endpoint, options);
                    if (response.ok) {
                        const result = await response.json();
                        
                        // Handle GraphQL response
                        if (result.data && result.data.account) {
                            data = result.data.account;
                            data.address = address;
                            break;
                        }
                        // Handle REST response
                        if (result.status === '1' || result.result || result.balance !== undefined) {
                            data = result.result || result;
                            if (!data.address) data.address = address;
                            break;
                        }
                    }
                } catch (e) {
                    // Log CORS errors but continue
                    if (e.message.includes('CORS')) {
                        console.warn('QuaiScan address API CORS error');
                    }
                    continue;
                }
            }

            // Fallback: Use RPC to get balance and transaction count
            if (!data) {
                const balance = await this.rpcCall('eth_getBalance', [address, 'latest']);
                const txCount = await this.rpcCall('eth_getTransactionCount', [address, 'latest']);

                if (balance && balance.result) {
                    const balanceInQuai = parseInt(balance.result, 16) / Math.pow(10, 18);
                    this.quaiscanData.addressInfo = {
                        balance: balanceInQuai,
                        transactionCount: txCount && txCount.result ? parseInt(txCount.result, 16) : 0,
                        address: address
                    };
                }
            } else {
                // Process QuaiScan API response
                const balance = typeof data.balance === 'string' 
                    ? parseInt(data.balance, 16) / Math.pow(10, 18)
                    : (data.balance || 0) / Math.pow(10, 18);
                
                this.quaiscanData.addressInfo = {
                    balance: balance,
                    transactionCount: data.transactionCount || data.nonce || 0,
                    firstSeen: data.firstSeen || null,
                    address: address
                };
            }

            // Update QuaiScan links to point to this address
            this.updateQuaiScanLinks(address);

            // QuaiScan now only handles transaction data
            // Transaction history section is shown when wallet is connected
            // QuaiScan UI updates are handled in transaction history section
        } catch (error) {
            console.error('Error fetching QuaiScan address info:', error);
            // Better error messages
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                this.addLog('QuaiScan address API CORS error. Using RPC fallback for balance.', 'warning');
            } else {
                this.addLog(`QuaiScan address API error: ${error.message}. Using RPC fallback.`, 'warning');
            }
        }
    }

    updateQuaiScanUI() {
        // QuaiScan now only handles transaction data, not network stats
        // Network stats are handled by Elastic blockchain data API
        // Transaction history UI is updated in updateTransactionHistory()
    }
    
    // Utility function to format numbers
    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toLocaleString();
    }
    
    // Utility function to format hash rate
    formatHashRate(hashRate) {
        if (!hashRate || hashRate === 0) return '0.00 MH/s';
        if (hashRate >= 1e9) return (hashRate / 1e9).toFixed(2) + ' GH/s';
        if (hashRate >= 1e6) return (hashRate / 1e6).toFixed(2) + ' MH/s';
        if (hashRate >= 1e3) return (hashRate / 1e3).toFixed(2) + ' KH/s';
        return hashRate.toFixed(2) + ' H/s';
    }

    setupCharts() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            this.addLog('Chart.js not loaded. Charts will not be available.', 'warning');
            return;
        }
        
        // Hash Rate Chart
        const hashRateChartEl = document.getElementById('hashRateChart');
        if (!hashRateChartEl) {
            this.addLog('Hash rate chart element not found', 'warning');
        } else {
            const hashRateCtx = hashRateChartEl.getContext('2d');
            this.hashRateChart = new Chart(hashRateCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Hash Rate (MH/s)',
                    data: [],
                    borderColor: '#DC2626', // Quai Red
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: CONFIG.charts.animationDuration
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#f1f5f9'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            }
        });
        }

        // Temperature Chart
        const tempChartEl = document.getElementById('temperatureChart');
        if (!tempChartEl) {
            this.addLog('Temperature chart element not found', 'warning');
        } else {
            const tempCtx = tempChartEl.getContext('2d');
            this.temperatureChart = new Chart(tempCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'GPU Temperature (°C)',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: CONFIG.charts.animationDuration
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#f1f5f9'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            }
        });
        }

        // Reward History Chart
        const rewardChartEl = document.getElementById('rewardChart');
        if (!rewardChartEl) {
            this.addLog('Reward chart element not found', 'warning');
        } else {
            const rewardCtx = rewardChartEl.getContext('2d');
            this.rewardChart = new Chart(rewardCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'QUAI Earnings',
                    data: [],
                    borderColor: '#DC2626', // Quai Red
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'QI Earnings',
                    data: [],
                    borderColor: '#991B1B', // Dark Red
                    backgroundColor: 'rgba(153, 27, 27, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: CONFIG.charts.animationDuration
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#f1f5f9'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            }
        });
        }

        // Difficulty History Chart
        const difficultyChartEl = document.getElementById('difficultyChart');
        if (!difficultyChartEl) {
            this.addLog('Difficulty chart element not found', 'warning');
        } else {
            const difficultyCtx = difficultyChartEl.getContext('2d');
            this.difficultyChart = new Chart(difficultyCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Network Difficulty',
                    data: [],
                    borderColor: '#EF4444', // Bright Red
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: CONFIG.charts.animationDuration
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#f1f5f9'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: '#94a3b8',
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            }
        });
        }
    }

    startUpdates() {
        // Simulate mining start after 2 seconds
        setTimeout(() => {
            this.miningData.isMining = true;
            this.updateStatus('active');
            this.addLog('Mining started successfully', 'success');
        }, 2000);

        // Update dashboard every interval
        this.updateTimer = setInterval(() => {
            // Only use simulated data if API is not enabled
            if (!CONFIG.api.enabled) {
                this.updateMiningData();
            }
            // Always update UI, charts, and averages
            this.updateUI();
            this.updateCharts();
            this.updateRunningAverages();
            
            // Check for temperature alerts
            this.checkTemperatureAlerts();
        }, this.updateInterval);
        
        this.addLog(`Data collection started (interval: ${this.updateInterval / 1000}s)`, 'info');
    }

    startAPIConnection() {
        // For quai-gpu-miner, we use the node RPC URL (same as CONFIG.node.rpcUrl)
        // The API URL should point to the Quai node RPC endpoint
        const apiUrl = CONFIG.api.url || CONFIG.node.rpcUrl;
        
        if (!apiUrl) {
            this.addLog('API/Node RPC URL not configured. Check CONFIG.api.url or CONFIG.node.rpcUrl in config.js', 'warning');
            return;
        }
        
        this.addLog(`Connecting to Quai node RPC for mining stats: ${apiUrl}`, 'info');
        
        // Connect to API at configured interval
        this.apiConnectionInterval = setInterval(() => {
            this.connectToMinerAPI(apiUrl);
        }, CONFIG.api.updateInterval);
        
        // Fetch immediately
        this.connectToMinerAPI(apiUrl);
        
        this.addLog(`Quai miner API connection enabled: ${apiUrl}`, 'info');
        this.addLog(`API data collection interval: ${CONFIG.api.updateInterval / 1000}s`, 'info');
        
        // Also check node status periodically if solo mining
        if (CONFIG.mining.mode === 'solo') {
            this.nodeStatusInterval = setInterval(() => {
                this.checkNodeStatus();
            }, 30000); // Check every 30 seconds
        }
    }

    updateMiningData() {
        // Ensure GPUs are initialized
        if (!this.miningData.gpus || this.miningData.gpus.length === 0) {
            if (CONFIG.gpus && CONFIG.gpus.length > 0) {
                this.miningData.gpus = CONFIG.gpus.map(gpu => ({
                    ...gpu,
                    hashRate: 0,
                    temperature: gpu.targetTemp || 40,
                    fanSpeed: 30,
                    powerUsage: 0,
                    memoryTemp: gpu.targetTemp || 40
                }));
            } else {
                // Create default GPU if none configured
                this.miningData.gpus = [{
                    id: 0,
                    name: 'GPU 0',
                    baseHashRate: 10.5,
                    maxTemp: 85,
                    targetTemp: 70,
                    hashRate: 0,
                    temperature: 70,
                    fanSpeed: 30,
                    powerUsage: 0,
                    memoryTemp: 70
                }];
            }
        }
        
        if (!this.miningData.isMining) {
            // Still update GPU data even when not mining (show idle state)
            this.miningData.gpus.forEach((gpu, index) => {
                const config = CONFIG.gpus[index];
                if (config) {
                    // Keep minimal data when not mining
                    gpu.hashRate = 0;
                    gpu.temperature = config.targetTemp || 40;
                    gpu.fanSpeed = 30;
                    gpu.powerUsage = 20; // Idle power
                    gpu.memoryTemp = gpu.temperature + 5;
                }
            });
            return;
        }

        // Simulate realistic mining data
        this.miningData.gpus.forEach((gpu, index) => {
            const baseHashRate = CONFIG.gpus[index]?.baseHashRate || gpu.baseHashRate || 10.5;
            const variance = (Math.random() - 0.5) * 1.5; // ±0.75 MH/s variance
            gpu.hashRate = Math.max(0, baseHashRate + variance);
        });

        // Calculate total hash rate
        if (this.miningData.gpus && this.miningData.gpus.length > 0) {
            this.miningData.hashRate = this.miningData.gpus.reduce((sum, gpu) => sum + (gpu.hashRate || 0), 0);
        } else {
            this.miningData.hashRate = 0;
        }

        // Track share history for rate calculation
        const now = Date.now();
        if (!this.shareTimestamps) {
            this.shareTimestamps = [];
        }
        
        // Update shares (occasionally)
        if (Math.random() < 0.1) { // 10% chance per update
            if (Math.random() < CONFIG.mining.acceptanceRate) {
                this.miningData.acceptedShares++;
                this.shareTimestamps.push(now);
                this.addLog(`Share accepted! Hash: ${this.miningData.hashRate.toFixed(2)} MH/s`, 'success');
            } else {
                this.miningData.rejectedShares++;
                this.addLog('Share rejected', 'warning');
            }
        }

        // Calculate share rate (shares per minute)
        // Keep only timestamps from last minute
        this.shareTimestamps = this.shareTimestamps.filter(ts => now - ts < 60000);
        this.miningData.shareRate = (this.shareTimestamps.length / 60) * (60000 / this.updateInterval);

        // Update QUAI and QI earnings (solo mining rewards)
        const earningsPerHour = this.miningData.hashRate * CONFIG.mining.earningsPerMHPerHour;
        this.miningData.rewards.quaiEarnings += earningsPerHour / (3600 / (this.updateInterval / 1000));
        // QI is typically a percentage of QUAI (adjust based on SOAP protocol)
        this.miningData.rewards.qiEarnings += (earningsPerHour * 0.1) / (3600 / (this.updateInterval / 1000));

        // Only simulate difficulty if we haven't received real data from node
        // Real difficulty will be updated by fetchNodeMetrics()
        if (this.miningData.network.difficulty === 0 && !this.miningData.network.lastMetricsUpdate) {
            // Simulate difficulty changes (fallback only)
            this.miningData.network.difficulty = 1000000000 + Math.random() * 100000000;
        }

        // Calculate estimated time to block (solo mining)
        this.calculateTimeToBlock();

        // Update GPU data - ensure GPUs are initialized
        if (!this.miningData.gpus || this.miningData.gpus.length === 0) {
            if (CONFIG.gpus && CONFIG.gpus.length > 0) {
                this.miningData.gpus = CONFIG.gpus.map(gpu => ({
                    ...gpu,
                    hashRate: 0,
                    temperature: gpu.targetTemp || 40,
                    fanSpeed: 30,
                    powerUsage: 0,
                    memoryTemp: gpu.targetTemp || 40
                }));
            }
        }
        
        if (this.miningData.gpus && this.miningData.gpus.length > 0) {
            this.miningData.gpus.forEach((gpu, index) => {
                const config = CONFIG.gpus[index] || gpu;
                const targetTemp = config?.targetTemp || gpu.targetTemp || 70;
                const maxTemp = config?.maxTemp || gpu.maxTemp || 85;
                
                // Temperature simulation (stabilizes around target)
                const tempVariance = (Math.random() - 0.5) * 10;
                gpu.temperature = Math.max(40, Math.min(maxTemp, targetTemp + tempVariance));
                
                // Fan speed based on temperature
                gpu.fanSpeed = Math.min(100, Math.max(30, (gpu.temperature - 40) * 2));
                
                // Power usage (varies with temperature and hash rate)
                const basePower = CONFIG.mining.basePowerConsumption || 150;
                gpu.powerUsage = Math.round(basePower + (gpu.temperature - 60) * 2 + (gpu.hashRate * 5));
                
                // Memory temperature (usually 5-10°C higher)
                gpu.memoryTemp = gpu.temperature + 5 + Math.random() * 5;
            });
        }

        // Total power usage
        if (this.miningData.gpus && this.miningData.gpus.length > 0) {
            this.miningData.powerUsage = this.miningData.gpus.reduce((sum, gpu) => sum + (gpu.powerUsage || 0), 0);
        } else {
            this.miningData.powerUsage = 0;
        }
        
        // Calculate efficiency (MH/s per Watt)
        if (this.miningData.powerUsage > 0) {
            this.miningData.efficiency = this.miningData.hashRate / (this.miningData.powerUsage / 1000); // Convert to kW
        }
    }

    updateUI() {
        // Running averages removed - not displayed in UI to avoid duplication

        // Ensure GPUs are initialized before updating
        if (!this.miningData.gpus || this.miningData.gpus.length === 0) {
            if (CONFIG.gpus && CONFIG.gpus.length > 0) {
                this.miningData.gpus = CONFIG.gpus.map(gpu => ({
                    ...gpu,
                    hashRate: gpu.hashRate || 0,
                    temperature: gpu.temperature || (gpu.targetTemp || 40),
                    fanSpeed: gpu.fanSpeed || 30,
                    powerUsage: gpu.powerUsage || 0,
                    memoryTemp: gpu.memoryTemp || (gpu.temperature || 40)
                }));
            }
        }

        // Update main stats (with null checks)
        const hashRateEl = document.getElementById('hashRate');
        const acceptedSharesEl = document.getElementById('acceptedShares');
        const rejectedSharesEl = document.getElementById('rejectedShares');
        const shareRateEl = document.getElementById('shareRate');
        const powerUsageEl = document.getElementById('powerUsage');
        const efficiencyEl = document.getElementById('efficiency');
        const uptimeEl = document.getElementById('uptime');
        
        if (hashRateEl) hashRateEl.textContent = this.miningData.hashRate.toFixed(2);
        if (acceptedSharesEl) acceptedSharesEl.textContent = this.miningData.acceptedShares;
        if (rejectedSharesEl) rejectedSharesEl.textContent = this.miningData.rejectedShares;
        if (shareRateEl) shareRateEl.textContent = this.miningData.shareRate.toFixed(2);
        if (powerUsageEl) powerUsageEl.textContent = this.miningData.powerUsage;
        if (efficiencyEl) efficiencyEl.textContent = this.miningData.efficiency.toFixed(2);
        
        // Update rewards (solo mining)
        const quaiEl = document.getElementById('quaiEarnings');
        const qiEl = document.getElementById('qiEarnings');
        const quaiEarningsUnit = document.getElementById('quaiEarningsUnit');
        
        if (quaiEl) {
            quaiEl.textContent = this.formatCurrency(this.miningData.rewards.quaiEarnings);
        }
        if (qiEl) {
            qiEl.textContent = this.formatCurrency(this.miningData.rewards.qiEarnings);
        }
        if (quaiEarningsUnit) {
            const currency = this.settings.displayCurrency || 'QUAI';
            const currencyInfo = CONFIG.currencies.available.find(c => c.code === currency);
            quaiEarningsUnit.textContent = currencyInfo ? currencyInfo.symbol : 'QUAI';
        }
        
        // Update USD estimates for earnings
        const quaiEstimateEl = document.getElementById('quaiEstimate');
        const qiEstimateEl = document.getElementById('qiEstimate');
        if (quaiEstimateEl) {
            const usdValue = this.convertCurrency(this.miningData.rewards.quaiEarnings, 'QUAI', 'USD');
            if (usdValue > 0 && CONFIG.currencies?.exchangeRates?.USD > 0) {
                quaiEstimateEl.textContent = `~$${usdValue.toFixed(2)} USD`;
            } else {
                quaiEstimateEl.textContent = '~$0.00 USD';
            }
        }
        if (qiEstimateEl) {
            const usdValue = this.convertCurrency(this.miningData.rewards.qiEarnings, 'QUAI', 'USD');
            if (usdValue > 0 && CONFIG.currencies?.exchangeRates?.USD > 0) {
                qiEstimateEl.textContent = `~$${usdValue.toFixed(2)} USD`;
            } else {
                qiEstimateEl.textContent = '~$0.00 USD';
            }
        }
        
        // Update time to block
        const timeToBlockEl = document.getElementById('timeToBlock');
        if (timeToBlockEl) {
            if (this.miningData.rewards.estimatedTimeToBlock) {
                const days = Math.floor(this.miningData.rewards.estimatedTimeToBlock / 86400);
                const hours = Math.floor((this.miningData.rewards.estimatedTimeToBlock % 86400) / 3600);
                if (days > 0) {
                    timeToBlockEl.textContent = `${days}d ${hours}h`;
                } else {
                    timeToBlockEl.textContent = `${hours}h`;
                }
            } else {
                timeToBlockEl.textContent = '--';
            }
        }
        
        const blockProbEl = document.getElementById('blockProbability');
        if (blockProbEl) {
            blockProbEl.textContent = `Probability: ${(this.miningData.rewards.blockProbability * 100).toFixed(4)}%`;
        }
        
        const blocksFoundEl = document.getElementById('blocksFound');
        if (blocksFoundEl) blocksFoundEl.textContent = this.miningData.rewards.blocksFound;
        
        const lastBlockEl = document.getElementById('lastBlockTime');
        if (lastBlockEl) {
            if (this.miningData.rewards.lastBlockTime) {
                const diff = Date.now() - this.miningData.rewards.lastBlockTime;
                const hours = Math.floor(diff / 3600000);
                lastBlockEl.textContent = `Last: ${hours > 0 ? hours + 'h ago' : 'Just now'}`;
            } else {
                lastBlockEl.textContent = 'Last: Never';
            }
        }
        
        // Update Quai Network info
        this.updateQuaiNetworkInfo();

        // Update uptime
        if (uptimeEl) {
            const uptime = Date.now() - this.startTime;
            const hours = Math.floor(uptime / 3600000);
            const minutes = Math.floor((uptime % 3600000) / 60000);
            const seconds = Math.floor((uptime % 60000) / 1000);
            uptimeEl.textContent = 
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        // Update GPU cards
        this.updateGPUCards();
    }
    
    calculateTimeToBlock() {
        // Estimate time to find a block based on hash rate and difficulty
        // Formula: time = difficulty / (hashrate * 2^32)
        if (this.miningData.hashRate > 0 && this.miningData.network.difficulty > 0) {
            const hashRateHashes = this.miningData.hashRate * 1000000; // Convert MH/s to H/s
            const difficulty = this.miningData.network.difficulty;
            const timeSeconds = difficulty / (hashRateHashes * Math.pow(2, 32));
            this.miningData.rewards.estimatedTimeToBlock = timeSeconds;
            
            // Calculate probability (simplified)
            this.miningData.rewards.blockProbability = Math.min(1, (hashRateHashes * this.updateInterval / 1000) / difficulty);
        } else {
            // Use default difficulty if not available
            const defaultDifficulty = 1000000000; // Example difficulty
            const hashRateHashes = this.miningData.hashRate * 1000000;
            if (hashRateHashes > 0) {
                const timeSeconds = defaultDifficulty / (hashRateHashes * Math.pow(2, 32));
                this.miningData.rewards.estimatedTimeToBlock = timeSeconds;
            }
        }
    }

    updateGPUCards() {
        const gpuGrid = document.getElementById('gpuGrid');
        if (!gpuGrid) {
            console.warn('GPU grid element not found');
            return;
        }
        
        // Check if we have GPU data
        if (!this.miningData.gpus || this.miningData.gpus.length === 0) {
            // Initialize GPUs from config if not already done
            if (CONFIG.gpus && CONFIG.gpus.length > 0) {
                this.miningData.gpus = CONFIG.gpus.map(gpu => ({
                    ...gpu,
                    hashRate: 0,
                    temperature: gpu.targetTemp || 40,
                    fanSpeed: 30,
                    powerUsage: 0,
                    memoryTemp: gpu.targetTemp || 40
                }));
            } else {
                gpuGrid.innerHTML = '<div class="gpu-card"><p style="color: var(--text-secondary);">No GPUs configured. Add GPU information in config.js</p></div>';
                return;
            }
        }
        
        gpuGrid.innerHTML = '';

        this.miningData.gpus.forEach(gpu => {
            const gpuCard = document.createElement('div');
            gpuCard.className = 'gpu-card';
            
            const thresholds = CONFIG.display.tempThresholds;
            let tempClass = 'cool';
            if (gpu.temperature >= thresholds.hot) {
                tempClass = 'hot';
            } else if (gpu.temperature >= thresholds.warm) {
                tempClass = 'warm';
            }
            
            gpuCard.innerHTML = `
                <h3>${gpu.name}</h3>
                <div class="gpu-info">
                    <div class="gpu-info-item">
                        <span class="gpu-info-label">Hash Rate</span>
                        <span class="gpu-info-value">${gpu.hashRate.toFixed(2)} MH/s</span>
                    </div>
                    <div class="gpu-info-item">
                        <span class="gpu-info-label">Temperature</span>
                        <span class="gpu-info-value">
                            <span class="temperature-indicator ${tempClass}">${gpu.temperature.toFixed(1)}°C</span>
                        </span>
                    </div>
                    <div class="gpu-info-item">
                        <span class="gpu-info-label">Memory Temp</span>
                        <span class="gpu-info-value">${gpu.memoryTemp.toFixed(1)}°C</span>
                    </div>
                    <div class="gpu-info-item">
                        <span class="gpu-info-label">Fan Speed</span>
                        <span class="gpu-info-value">${gpu.fanSpeed.toFixed(0)}%</span>
                    </div>
                    <div class="gpu-info-item">
                        <span class="gpu-info-label">Power Usage</span>
                        <span class="gpu-info-value">${gpu.powerUsage}W</span>
                    </div>
                    <div class="gpu-info-item">
                        <span class="gpu-info-label">Status</span>
                        <span class="gpu-info-value" style="color: ${this.miningData.isMining ? '#10b981' : '#ef4444'}">
                            ${this.miningData.isMining ? 'Mining' : 'Idle'}
                        </span>
                    </div>
                </div>
            `;
            
            gpuGrid.appendChild(gpuCard);
        });
    }

    updateCharts() {
        const now = new Date();
        const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        // Update hash rate chart
        this.hashRateHistory.push({
            time: timeLabel,
            value: this.miningData.hashRate
        });
        
        if (this.hashRateHistory.length > this.maxHistoryPoints) {
            this.hashRateHistory.shift();
        }
        
        if (this.hashRateChart) {
            this.hashRateChart.data.labels = this.hashRateHistory.map(d => d.time);
            this.hashRateChart.data.datasets[0].data = this.hashRateHistory.map(d => d.value);
            this.hashRateChart.update('none');
        }

        // Update temperature chart
        if (this.temperatureChart && this.miningData.gpus.length > 0) {
            this.temperatureHistory.push({
                time: timeLabel,
                value: this.miningData.gpus[0].temperature
            });
            
            if (this.temperatureHistory.length > this.maxHistoryPoints) {
                this.temperatureHistory.shift();
            }
            
            this.temperatureChart.data.labels = this.temperatureHistory.map(d => d.time);
            this.temperatureChart.data.datasets[0].data = this.temperatureHistory.map(d => d.value);
            this.temperatureChart.update('none');
        }

        // Update reward chart
        if (this.rewardChart) {
            this.miningData.rewardHistory.push({
                time: timeLabel,
                quai: this.miningData.rewards.quaiEarnings,
                qi: this.miningData.rewards.qiEarnings
            });
            
            if (this.miningData.rewardHistory.length > this.maxHistoryPoints) {
                this.miningData.rewardHistory.shift();
            }
            
            this.rewardChart.data.labels = this.miningData.rewardHistory.map(d => d.time);
            this.rewardChart.data.datasets[0].data = this.miningData.rewardHistory.map(d => d.quai);
            this.rewardChart.data.datasets[1].data = this.miningData.rewardHistory.map(d => d.qi);
            this.rewardChart.update('none');
        }

        // Update difficulty chart
        if (this.difficultyChart && this.miningData.network.difficulty > 0) {
            this.miningData.difficultyHistory.push({
                time: timeLabel,
                value: this.miningData.network.difficulty
            });
            
            if (this.miningData.difficultyHistory.length > this.maxHistoryPoints) {
                this.miningData.difficultyHistory.shift();
            }
            
            this.difficultyChart.data.labels = this.miningData.difficultyHistory.map(d => d.time);
            this.difficultyChart.data.datasets[0].data = this.miningData.difficultyHistory.map(d => d.value);
            this.difficultyChart.update('none');
        }
    }

    updateStatus(status) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        statusDot.className = 'status-dot';
        
        switch(status) {
            case 'active':
                statusDot.classList.add('active');
                statusText.textContent = 'Mining Active';
                break;
            case 'inactive':
                statusDot.classList.add('inactive');
                statusText.textContent = 'Mining Inactive';
                break;
            default:
                statusText.textContent = 'Connecting...';
        }
    }

    addLog(message, type = 'info') {
        const logsContainer = document.getElementById('logsContainer');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span>${message}`;
        
        logsContainer.insertBefore(logEntry, logsContainer.firstChild);
        
        // Keep only configured number of log entries
        while (logsContainer.children.length > CONFIG.display.maxLogEntries) {
            logsContainer.removeChild(logsContainer.lastChild);
        }
    }

    // Method to connect to real mining software API
    async connectToMinerAPI(apiUrl) {
        try {
            // For quai-gpu-miner, we use node RPC calls to get mining statistics
            // The node RPC provides mining stats via eth_* and quai_* methods
            // Use the proper rpcCall method which handles JSON-RPC 2.0 format and error handling
            // Note: apiUrl should be the Quai node RPC endpoint (e.g., http://192.168.2.110:8545)
            
            // Temporarily set node RPC URL if different from apiUrl
            const originalRpcUrl = CONFIG.node.rpcUrl;
            if (apiUrl && apiUrl !== CONFIG.node.rpcUrl) {
                CONFIG.node.rpcUrl = apiUrl;
            }
            
            // Check if mining is active
            // Try eth_mining first, then quai_mining as fallback
            let miningStatus = await this.rpcCall('eth_mining', []);
            
            if (miningStatus.error) {
                // If eth_mining fails, try quai_mining (Quai-specific method)
                const quaiMiningStatus = await this.rpcCall('quai_mining', []);
                if (!quaiMiningStatus.error) {
                    // Use quai result if eth failed but quai succeeded
                    miningStatus = quaiMiningStatus;
                } else {
                    // Both failed - log but don't return, continue to try hashrate
                    this.addLog(`Mining status check failed: ${miningStatus.error.message || quaiMiningStatus.error.message}. Will try hashrate check.`, 'warning');
                    // Set default to false but continue
                    this.miningData.isMining = false;
                }
            }
            
            // Set mining status if we got a valid result
            if (!miningStatus.error && (miningStatus.result === true || miningStatus.result === false)) {
                this.miningData.isMining = miningStatus.result === true;
            }
            
            // Always try to fetch hashrate (even if mining status check failed)
            // This helps us get data even if mining status RPC method isn't available
            let hashrateResponse = await this.rpcCall('eth_getHashrate', []);
            
            // If eth_getHashrate fails, try quai_getHashrate
            if (hashrateResponse.error) {
                hashrateResponse = await this.rpcCall('quai_getHashrate', []);
            }
            
            // If we got hashrate data, update mining status and hash rate
            if (!hashrateResponse.error && hashrateResponse.result !== null && hashrateResponse.result !== undefined) {
                // Convert from hex to decimal MH/s
                let hashrateDecimal;
                if (typeof hashrateResponse.result === 'string') {
                    // Hex string format (e.g., "0x1234" or just hex number)
                    hashrateDecimal = parseInt(hashrateResponse.result, 16);
                } else if (typeof hashrateResponse.result === 'number') {
                    // Already a number
                    hashrateDecimal = hashrateResponse.result;
                } else {
                    // Try to parse as string
                    hashrateDecimal = parseInt(String(hashrateResponse.result), 16);
                }
                
                // Process hashrate if it's a valid number (even if 0)
                if (!isNaN(hashrateDecimal)) {
                    const hashrateMH = hashrateDecimal / 1000000; // Convert to MH/s
                    
                    // Update mining data
                    this.miningData.hashRate = hashrateMH;
                    
                    // If hashrate > 0, mining is active
                    if (hashrateDecimal > 0) {
                        this.miningData.isMining = true;
                        
                        // Update GPU hash rate (distribute across configured GPUs)
                        if (this.miningData.gpus && this.miningData.gpus.length > 0) {
                            const hashPerGPU = hashrateMH / this.miningData.gpus.length;
                            this.miningData.gpus.forEach(gpu => {
                                gpu.hashRate = hashPerGPU;
                            });
                        }
                        
                        this.updateStatus('active');
                    } else {
                        // Hashrate is 0 - not mining
                        this.miningData.isMining = false;
                        // Reset GPU hash rates
                        if (this.miningData.gpus && this.miningData.gpus.length > 0) {
                            this.miningData.gpus.forEach(gpu => {
                                gpu.hashRate = 0;
                            });
                        }
                        this.updateStatus('inactive');
                    }
                }
                
                // Also try to get work data for additional stats
                try {
                    const workResponse = await this.rpcCall('eth_getWork', []);
                    if (!workResponse.error && workResponse.result && Array.isArray(workResponse.result) && workResponse.result.length > 0) {
                        // Work data available - mining is active
                        this.miningData.isMining = true;
                        this.updateStatus('active');
                    }
                } catch (workError) {
                    // Work call failed, but that's okay - not all nodes support this
                    console.debug('Work data fetch failed (this is normal):', workError);
                }
            } else {
                // Mining is not active
                this.miningData.isMining = false;
                this.miningData.hashRate = 0;
                // Reset GPU hash rates
                if (this.miningData.gpus && this.miningData.gpus.length > 0) {
                    this.miningData.gpus.forEach(gpu => {
                        gpu.hashRate = 0;
                    });
                }
                this.updateStatus('inactive');
            }
            
        } catch (error) {
            this.addLog(`Miner API Error: ${error.message}`, 'error');
            console.error('Failed to fetch mining data from node RPC:', error);
            // Don't mark as inactive on first error - might be temporary connection issue
        } finally {
            // Restore original RPC URL if we changed it
            if (typeof originalRpcUrl !== 'undefined' && apiUrl && apiUrl !== originalRpcUrl) {
                CONFIG.node.rpcUrl = originalRpcUrl;
            }
        }
    }

    updateFromAPI(data) {
        // Update mining data from API response
        // Customize this method based on your mining software's API format
        
        if (data.hashRate !== undefined) {
            this.miningData.hashRate = data.hashRate;
        }
        
        if (data.shares) {
            this.miningData.acceptedShares = data.shares.accepted || this.miningData.acceptedShares;
            this.miningData.rejectedShares = data.shares.rejected || this.miningData.rejectedShares;
        }
        
        if (data.gpus && Array.isArray(data.gpus)) {
            data.gpus.forEach((apiGpu, index) => {
                if (this.miningData.gpus[index]) {
                    Object.assign(this.miningData.gpus[index], apiGpu);
                }
            });
        }
        
        if (data.earnings !== undefined) {
            this.miningData.earnings = data.earnings;
        }
        
        if (data.powerUsage !== undefined) {
            this.miningData.powerUsage = data.powerUsage;
        }
        
        if (data.isMining !== undefined) {
            this.miningData.isMining = data.isMining;
            this.updateStatus(data.isMining ? 'active' : 'inactive');
        }
        
        // Quai Network specific data
        if (data.network) {
            if (data.network.nodeSynced !== undefined) {
                this.miningData.network.nodeSynced = data.network.nodeSynced;
            }
            if (data.network.currentChain) {
                this.miningData.network.currentChain = data.network.currentChain;
            }
            if (data.network.blockHeight !== undefined) {
                this.miningData.network.blockHeight = data.network.blockHeight;
            }
            if (data.network.difficulty !== undefined) {
                this.miningData.network.difficulty = data.network.difficulty;
            }
        }
    }

    // Quai Network specific methods
    updateQuaiNetworkInfo() {
        // Update network type badge (testnet/mainnet)
        const networkTypeEl = document.getElementById('networkType');
        if (networkTypeEl && CONFIG.network.networkType) {
            if (CONFIG.network.networkType === 'testnet') {
                networkTypeEl.textContent = 'Orchard Testnet';
                networkTypeEl.className = 'network-badge testnet';
                networkTypeEl.style.display = 'inline-block';
            } else {
                networkTypeEl.style.display = 'none'; // Hide for mainnet
            }
        }

        // Update mining mode badge
        const miningModeEl = document.getElementById('miningMode');
        if (miningModeEl) {
            miningModeEl.textContent = CONFIG.mining.mode === 'solo' ? 'Solo Mining' : 'Pool Mining';
        }

        // Update merged mining badge
        const mergedMiningEl = document.getElementById('mergedMiningStatus');
        if (mergedMiningEl) {
            if (CONFIG.mining.mergedMining.enabled) {
                mergedMiningEl.style.display = 'inline-block';
                mergedMiningEl.textContent = `Merged Mining (${CONFIG.mining.mergedMining.chains.length} chains)`;
            } else {
                mergedMiningEl.style.display = 'none';
            }
        }

        // Update network status section - Always show for solo miners
        const networkSection = document.getElementById('networkStatusSection');
        if (networkSection) {
            // Always show for solo mining mode
            if (CONFIG.mining.mode === 'solo') {
                networkSection.style.display = 'block';
            } else if (CONFIG.api.enabled || CONFIG.node.enableMetrics) {
                networkSection.style.display = 'block';
            } else {
                networkSection.style.display = 'none';
            }
            
            const nodeStatusEl = document.getElementById('nodeStatus');
            if (nodeStatusEl) {
                if (this.miningData.network.nodeSynced) {
                    nodeStatusEl.textContent = '✓ Fully Synced - Ready for Mining';
                    nodeStatusEl.style.color = '#00FF00';
                    nodeStatusEl.style.fontWeight = '900';
                } else if (this.miningData.network.lastMetricsUpdate) {
                    nodeStatusEl.textContent = '⚠️ Syncing - Wait Before Mining';
                    nodeStatusEl.style.color = '#FFAA00';
                    nodeStatusEl.style.fontWeight = '700';
                } else {
                    nodeStatusEl.textContent = '❌ Not Connected';
                    nodeStatusEl.style.color = '#FF0000';
                    nodeStatusEl.style.fontWeight = '700';
                }
            }
            
            // Update RPC Status
            const rpcStatusEl = document.getElementById('rpcStatus');
            if (rpcStatusEl) {
                if (this.miningData.network.lastMetricsUpdate && 
                    (Date.now() - this.miningData.network.lastMetricsUpdate) < 30000) {
                    rpcStatusEl.textContent = '✓ Connected';
                    rpcStatusEl.style.color = '#00FF00';
                } else if (CONFIG.node.rpcUrl) {
                    rpcStatusEl.textContent = '⚠️ Not Responding';
                    rpcStatusEl.style.color = '#FFAA00';
                } else {
                    rpcStatusEl.textContent = '❌ Not Configured';
                    rpcStatusEl.style.color = '#FF0000';
                }
            }

            const currentChainEl = document.getElementById('currentChain');
            if (currentChainEl) {
                currentChainEl.textContent = this.miningData.network.currentChain;
            }

            const blockHeightEl = document.getElementById('blockHeight');
            if (blockHeightEl) {
                blockHeightEl.textContent = this.miningData.network.blockHeight > 0 
                    ? this.miningData.network.blockHeight.toLocaleString() 
                    : '-';
            }

            const difficultyEl = document.getElementById('networkDifficulty');
            if (difficultyEl) {
                if (this.miningData.network.difficulty > 0) {
                    const difficulty = this.miningData.network.difficulty;
                    if (difficulty >= 1000000000) {
                        difficultyEl.textContent = `${(difficulty / 1000000000).toFixed(2)}B`;
                    } else if (difficulty >= 1000000) {
                        difficultyEl.textContent = `${(difficulty / 1000000).toFixed(2)}M`;
                    } else {
                        difficultyEl.textContent = difficulty.toLocaleString();
                    }
                } else {
                    difficultyEl.textContent = '-';
                }
            }

            const gasPriceEl = document.getElementById('gasPrice');
            if (gasPriceEl) {
                if (this.miningData.network.gasPrice > 0) {
                    gasPriceEl.textContent = `${this.miningData.network.gasPrice.toFixed(2)} Gwei`;
                } else {
                    gasPriceEl.textContent = '-';
                }
            }

            const peerCountEl = document.getElementById('peerCount');
            if (peerCountEl) {
                peerCountEl.textContent = this.miningData.network.peerCount > 0 
                    ? this.miningData.network.peerCount 
                    : '-';
            }

            const blockTimeEl = document.getElementById('blockTime');
            if (blockTimeEl) {
                if (this.miningData.network.blockTime > 0) {
                    blockTimeEl.textContent = `${this.miningData.network.blockTime}s`;
                } else {
                    blockTimeEl.textContent = '-';
                }
            }

            // Algorithm and Protocol removed - shown in header badge instead

            // Stratum status elements removed - not displayed in UI
            // Connection status is inferred from mining activity (isMining state)
        }
    }

    // Check stratum connection status
    async checkStratumConnection() {
        if (!CONFIG.api.stratum.enabled) return;

        // Note: Direct stratum protocol checking is limited from browser
        // We can check if the host is reachable via HTTP/WebSocket if available
        // For now, we'll infer connection status from mining activity
        
        // If miner API is available, we could check connection there
        // For now, connection status is inferred from isMining state
        this.addLog(`Stratum proxy configured: ${CONFIG.api.stratum.url}`, 'info');
    }

    // Check Quai node sync status (for solo mining)
    async checkNodeStatus() {
        if (!CONFIG.node.rpcUrl) return;

        try {
            // RPC call to check if node is synced
            const response = await fetch(CONFIG.node.rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_syncing',
                    params: [],
                    id: 1
                })
            });

            if (response.ok) {
                const data = await response.json();
                // If syncing is false, node is synced
                this.miningData.network.nodeSynced = data.result === false;
                
                if (!this.miningData.network.nodeSynced && CONFIG.node.requireSynced) {
                    this.addLog('⚠️ Warning: Quai node is not fully synced. Mining may produce invalid blocks.', 'warning');
                } else if (this.miningData.network.nodeSynced) {
                    this.addLog('✓ Quai node is fully synced', 'success');
                }
            }
        } catch (error) {
            // Node RPC not available - this is OK if using pool mining or API
            if (CONFIG.mining.mode === 'solo') {
                this.addLog(`Node RPC not accessible: ${error.message}`, 'warning');
            }
        }
    }

    // Start fetching real-time node metrics
    startNodeMetrics() {
        if (!CONFIG.node.rpcUrl) {
            this.addLog('Node RPC URL not configured. Set CONFIG.node.rpcUrl in config.js', 'warning');
            return;
        }

        this.addLog(`Connecting to Quai node at ${CONFIG.node.rpcUrl}...`, 'info');
        
        // Fetch immediately
        this.fetchNodeMetrics();

        // Then fetch at configured interval
        if (this.nodeMetricsInterval) {
            clearInterval(this.nodeMetricsInterval);
        }
        this.nodeMetricsInterval = setInterval(() => {
            this.fetchNodeMetrics();
        }, CONFIG.node.metricsUpdateInterval);
        
        this.addLog(`Node metrics collection started (interval: ${CONFIG.node.metricsUpdateInterval / 1000}s)`, 'info');
    }

    // Fetch comprehensive metrics from Quai node
    async fetchNodeMetrics() {
        if (!CONFIG.node.rpcUrl) {
            return;
        }

        try {
            // Test connection first with a simple call
            const testConnection = await this.rpcCall('eth_blockNumber', []);
            if (!testConnection || testConnection.error) {
                if (!this.nodeConnectionErrorShown) {
                    this.addLog(`Node connection failed: ${testConnection?.error?.message || 'Unable to connect'}`, 'error');
                    this.addLog(`Check if node is running at ${CONFIG.node.rpcUrl}`, 'info');
                    this.nodeConnectionErrorShown = true;
                }
                return;
            }

            // Reset error flag on success
            this.nodeConnectionErrorShown = false;

            // Fetch multiple metrics in parallel
            const metrics = await Promise.all([
                this.rpcCall('eth_blockNumber', []),
                this.rpcCall('eth_getBlockByNumber', ['latest', false]),
                this.rpcCall('eth_gasPrice', []),
                this.rpcCall('net_peerCount', []),
                this.rpcCall('eth_syncing', []),
                this.rpcCall('txpool_status', []),
            ]);

            // Update block height
            if (metrics[0] && metrics[0].result) {
                this.miningData.network.blockHeight = parseInt(metrics[0].result, 16);
            }

            // Update difficulty and block time from latest block
            if (metrics[1] && metrics[1].result) {
                const block = metrics[1].result;
                
                // Extract difficulty
                if (block.difficulty) {
                    this.miningData.network.difficulty = parseInt(block.difficulty, 16);
                }

                // Calculate block time (time between current and previous block)
                if (block.number && block.timestamp) {
                    const currentBlockNum = parseInt(block.number, 16);
                    const currentTimestamp = parseInt(block.timestamp, 16);
                    
                    // Get previous block to calculate time difference
                    if (currentBlockNum > 0) {
                        const prevBlock = await this.rpcCall('eth_getBlockByNumber', [`0x${(currentBlockNum - 1).toString(16)}`, false]);
                        if (prevBlock && prevBlock.result && prevBlock.result.timestamp) {
                            const prevTimestamp = parseInt(prevBlock.result.timestamp, 16);
                            this.miningData.network.blockTime = currentTimestamp - prevTimestamp;
                            
                            // Update last block time
                            if (!this.miningData.network.lastBlockTime) {
                                this.miningData.network.lastBlockTime = currentTimestamp * 1000; // Convert to ms
                            }
                        }
                    }
                }
            }

            // Update gas price
            if (metrics[2] && metrics[2].result) {
                const gasPriceWei = parseInt(metrics[2].result, 16);
                this.miningData.network.gasPrice = gasPriceWei / Math.pow(10, 9); // Convert to Gwei
            }

            // Update peer count
            if (metrics[3] && metrics[3].result) {
                this.miningData.network.peerCount = parseInt(metrics[3].result, 16);
            }

            // Update sync status
            if (metrics[4] && metrics[4].result !== undefined) {
                this.miningData.network.nodeSynced = metrics[4].result === false;
            }

            // Update pending transactions
            if (metrics[5] && metrics[5].result) {
                const pending = metrics[5].result.pending || metrics[5].result;
                if (typeof pending === 'string') {
                    this.miningData.network.pendingTransactions = parseInt(pending, 16);
                } else if (typeof pending === 'number') {
                    this.miningData.network.pendingTransactions = pending;
                }
            }

            // Recalculate time to block with real difficulty
            if (this.miningData.network.difficulty > 0) {
                this.calculateTimeToBlock();
            }

            // Mark that we've received real metrics
            this.miningData.network.lastMetricsUpdate = Date.now();
            this.nodeMetricsErrorLogged = false; // Reset error flag on success

        } catch (error) {
            console.error('Error fetching node metrics:', error);
            // Don't spam logs for connection errors
            if (!this.nodeMetricsErrorLogged) {
                this.addLog(`Node metrics unavailable: ${error.message}. Check RPC URL: ${CONFIG.node.rpcUrl}`, 'warning');
                this.nodeMetricsErrorLogged = true;
            }
        }
    }

    /**
     * Helper function for RPC calls with retry logic
     * Quai Network supports both eth_ (Ethereum-compatible) and quai_ prefixed methods
     * This function uses eth_ methods for compatibility, but can be extended to support quai_ methods
     * @param {string} method - RPC method name
     * @param {Array} params - RPC method parameters
     * @param {number} retries - Number of retry attempts (default: 3)
     * @returns {Promise<Object>} RPC response or error object
     */
    /**
     * Helper function for RPC calls with retry logic
     * Quai Network supports both eth_ (Ethereum-compatible) and quai_ prefixed methods
     * Official Source: https://github.com/dominant-strategies/go-quai
     * Documentation: https://docs.v2.qu.ai
     * 
     * @param {string} method - RPC method name (eth_* or quai_*)
     * @param {Array} params - RPC method parameters
     * @param {number} retries - Number of retry attempts (default: 3)
     * @returns {Promise<Object>} RPC response or error object
     */
    async rpcCall(method, params, retries = 3) {
        if (!CONFIG.node.rpcUrl) {
            return { error: { message: 'RPC URL not configured' } };
        }

        // Validate RPC URL format
        if (typeof DashboardUtils !== 'undefined' && !DashboardUtils.validateRPCUrl(CONFIG.node.rpcUrl)) {
            return { error: { message: 'Invalid RPC URL format' } };
        }

        // Use retry with backoff if available
        if (typeof DashboardUtils !== 'undefined' && DashboardUtils.retryWithBackoff) {
            try {
                return await DashboardUtils.retryWithBackoff(async () => {
                    return await this.executeRpcCall(method, params);
                }, retries, 1000);
            } catch (error) {
                console.error(`RPC call ${method} failed after ${retries} retries:`, error);
                return { error: { message: error.message } };
            }
        } else {
            // Fallback to simple retry
            return await this.executeRpcCall(method, params);
        }
    }

    /**
     * Execute a single RPC call
     * @private
     */
    async executeRpcCall(method, params) {
        try {
            // Quai Network supports both eth_* (Ethereum-compatible) and quai_* (Quai-specific) methods
            // Use the method as-is - the caller can specify which one to use
            // Quai Network RPC is compatible with Ethereum JSON-RPC 2.0
            let actualMethod = method;

            // Create abort controller for timeout (compatible with older browsers)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            try {
                const response = await fetch(CONFIG.node.rpcUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: actualMethod,
                        params: params,
                        id: Math.floor(Math.random() * 1000000)
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.error) {
                        console.error(`RPC error for ${method}:`, data.error);
                        return { error: data.error };
                    }
                    return data;
                } else {
                    console.error(`RPC HTTP error for ${method}:`, response.status, response.statusText);
                    return { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
                }
            } catch (error) {
                clearTimeout(timeoutId);
                
                // Handle CORS errors (common when calling RPC from browser)
                if (error.message && error.message.includes('CORS') || 
                    error.message && error.message.includes('cross-origin') ||
                    error.message && error.message.includes('Failed to fetch')) {
                    throw new Error(`CORS error: Cannot access RPC at ${CONFIG.node.rpcUrl} from browser. Enable CORS on your Quai node or use a proxy server.`);
                }
                
                // Handle timeout and network errors
                if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                    throw new Error('RPC call timed out');
                } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    throw new Error('Network error: Unable to reach RPC endpoint');
                }
                throw error;
            }
        } catch (error) {
            // Handle any outer errors
            if (error.message && error.message.includes('CORS')) {
                // CORS error - provide helpful message
                console.error('CORS Error:', error.message);
                return { 
                    error: { 
                        message: `CORS blocked: Cannot access ${CONFIG.node.rpcUrl} from browser. Enable CORS on your Quai node (add --http.corsdomain="*" or --http.corsdomain="http://localhost:8080" to node startup) or use a proxy server.`,
                        code: -32000
                    } 
                };
            }
            
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                throw new Error('RPC call timed out');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to reach RPC endpoint');
            }
            throw error;
        }
    }

    /**
     * Prometheus Integration
     * Official Source: https://github.com/dominant-strategies/go-quai
     * Metrics Config: go-quai/metrics_config/prometheus.yml
     * Documentation: https://docs.v2.qu.ai/docs/participate/node/node-monitoring
     * 
     * IMPORTANT: Update metric names in config.js with actual names from go-quai repository
     */
    initPrometheus() {
        if (!CONFIG.node.prometheus || !CONFIG.node.prometheus.enabled) {
            this.addLog('Prometheus integration disabled in config', 'info');
            return;
        }
        
        if (!CONFIG.node.prometheus.url) {
            this.addLog('Prometheus URL not configured. Check CONFIG.node.prometheus.url in config.js', 'warning');
            return;
        }
        
        this.addLog('Initializing Prometheus integration...', 'info');
        this.addLog(`Prometheus URL: ${CONFIG.node.prometheus.url}`, 'info');
        this.addLog('Check go-quai/metrics_config/prometheus.yml for metric names', 'info');
        
        // Start fetching Prometheus metrics
        this.fetchPrometheusMetrics();
        
        // Set up periodic updates
        if (this.prometheusInterval) {
            clearInterval(this.prometheusInterval);
        }
        
        const interval = CONFIG.node.prometheus.updateInterval || 10000;
        this.prometheusInterval = setInterval(() => {
            this.fetchPrometheusMetrics();
        }, interval);
        
        this.addLog(`Prometheus data collection started (interval: ${interval / 1000}s)`, 'info');
    }

    async queryPrometheus(query) {
        if (!CONFIG.node.prometheus || !CONFIG.node.prometheus.enabled) {
            return null;
        }

        try {
            const url = `${CONFIG.node.prometheus.url}${CONFIG.node.prometheus.queryEndpoint}?query=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Prometheus API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.status === 'success' && data.data && data.data.result && data.data.result.length > 0) {
                // Return the first result's value
                const result = data.data.result[0];
                if (result.value && result.value.length >= 2) {
                    return parseFloat(result.value[1]);
                }
            }
            
            return null;
        } catch (error) {
            console.error('Prometheus query error:', error);
            return null;
        }
    }

    async fetchPrometheusMetrics() {
        if (!CONFIG.node.prometheus || !CONFIG.node.prometheus.enabled) return;

        try {
            const metrics = CONFIG.node.prometheus.metrics;
            
            // Query Prometheus for each metric
            const queries = {};
            
            // Block height
            if (metrics.blockHeight) {
                queries.blockHeight = await this.queryPrometheus(metrics.blockHeight);
            }
            
            // Difficulty
            if (metrics.difficulty) {
                queries.difficulty = await this.queryPrometheus(metrics.difficulty);
            }
            
            // Block time
            if (metrics.blockTime) {
                queries.blockTime = await this.queryPrometheus(metrics.blockTime);
            }
            
            // Network hash rate
            if (metrics.networkHashRate) {
                queries.networkHashRate = await this.queryPrometheus(metrics.networkHashRate);
            }
            
            // Peer count
            if (metrics.peerCount) {
                queries.peerCount = await this.queryPrometheus(metrics.peerCount);
            }
            
            // Sync status
            if (metrics.syncStatus) {
                queries.syncStatus = await this.queryPrometheus(metrics.syncStatus);
            }

            // Update Prometheus data
            if (queries.blockHeight !== null) {
                this.prometheusData.blockHeight = queries.blockHeight;
                // Also update miningData if Prometheus value is available
                if (this.prometheusData.blockHeight > 0) {
                    this.miningData.network.blockHeight = this.prometheusData.blockHeight;
                }
            }

            if (queries.difficulty !== null) {
                this.prometheusData.difficulty = queries.difficulty;
                if (this.prometheusData.difficulty > 0) {
                    this.miningData.network.difficulty = this.prometheusData.difficulty;
                }
            }

            if (queries.blockTime !== null) {
                this.prometheusData.blockTime = queries.blockTime;
                if (this.prometheusData.blockTime > 0) {
                    this.miningData.network.blockTime = this.prometheusData.blockTime;
                }
            }

            if (queries.networkHashRate !== null) {
                this.prometheusData.networkHashRate = queries.networkHashRate;
                // Update Elastic data if available
                if (this.prometheusData.networkHashRate > 0) {
                    this.elasticData.networkHashRate = this.prometheusData.networkHashRate;
                    this.elasticData.latestBlock = this.prometheusData.blockHeight;
                    this.elasticData.difficulty = this.prometheusData.difficulty;
                    this.elasticData.blockTime = this.prometheusData.blockTime;
                    this.elasticData.lastUpdate = Date.now();
                    this.updateElasticUI();
                }
            }

            if (queries.peerCount !== null) {
                this.prometheusData.peerCount = queries.peerCount;
                if (this.prometheusData.peerCount >= 0) {
                    this.miningData.network.peerCount = this.prometheusData.peerCount;
                }
            }

            if (queries.syncStatus !== null) {
                this.prometheusData.syncStatus = queries.syncStatus === 1 || queries.syncStatus === true;
                this.miningData.network.nodeSynced = this.prometheusData.syncStatus;
            }

            this.prometheusData.lastUpdate = Date.now();
            
            // Update UI with Prometheus data
            this.updateQuaiNetworkInfo();
            // QuaiScan UI updates are handled in transaction history section
            
        } catch (error) {
            console.error('Error fetching Prometheus metrics:', error);
            if (!this.prometheusErrorLogged) {
                this.addLog(`Prometheus error: ${error.message}. Check Prometheus URL: ${CONFIG.node.prometheus.url}`, 'warning');
                this.prometheusErrorLogged = true;
            }
        }
    }
    
    /**
     * Initialize validated blocks tracking
     */
    initValidatedBlocks() {
        // Fetch validated blocks on load
        this.fetchValidatedBlocks();
        this.fetchBlockStats();
        
        // Update every 30 seconds (only if dashboard is visible)
        this.validatedBlocksInterval = setInterval(() => {
            if (!document.hidden) {
                this.fetchValidatedBlocks();
                this.fetchBlockStats();
            }
        }, 30000);
    }
    
    /**
     * Fetch validated blocks from API
     */
    async fetchValidatedBlocks() {
        try {
            const response = await fetch('/api/blocks/validated?limit=50');
            if (!response.ok) throw new Error('Failed to fetch validated blocks');
            
            const data = await response.json();
            this.updateValidatedBlocksUI(data.blocks);
        } catch (error) {
            console.error('Error fetching validated blocks:', error);
        }
    }
    
    /**
     * Fetch block statistics
     */
    async fetchBlockStats() {
        try {
            const response = await fetch('/api/blocks/stats');
            if (!response.ok) throw new Error('Failed to fetch block stats');
            
            const data = await response.json();
            this.updateBlockStatsUI(data);
        } catch (error) {
            console.error('Error fetching block stats:', error);
        }
    }
    
    /**
     * Update validated blocks UI
     */
    updateValidatedBlocksUI(blocks) {
        const container = document.getElementById('validatedBlocksList');
        if (!container) return;
        
        if (!blocks || blocks.length === 0) {
            container.innerHTML = '<div class="blocks-placeholder">No validated blocks yet. Start mining to see your blocks here!</div>';
            return;
        }
        
        container.innerHTML = blocks.map(block => `
            <div class="block-item">
                <div class="block-item-info">
                    <div class="block-item-number">Block #${block.blockNumber.toLocaleString()}</div>
                    <div class="block-item-details">
                        ${block.chain} • ${new Date(block.timestamp).toLocaleString()}
                        ${block.blockHash ? ` • ${block.blockHash.substring(0, 16)}...` : ''}
                    </div>
                </div>
                <div class="block-item-reward">
                    <div class="block-item-reward-value">${(block.reward || 0).toFixed(6)}</div>
                    <div class="block-item-reward-label">QUAI</div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Update block statistics UI
     */
    updateBlockStatsUI(stats) {
        const totalEl = document.getElementById('totalValidatedBlocks');
        const last24hEl = document.getElementById('blocksLast24h');
        const last7dEl = document.getElementById('blocksLast7d');
        const totalRewardEl = document.getElementById('totalBlockReward');
        
        if (totalEl) totalEl.textContent = stats.total || 0;
        if (last24hEl) last24hEl.textContent = stats.last24h || 0;
        if (last7dEl) last7dEl.textContent = stats.last7d || 0;
        if (totalRewardEl) totalRewardEl.textContent = (stats.totalReward || 0).toFixed(6);
    }
    
    /**
     * Initialize miner management (configuration and remote control)
     */
    initMinerManagement() {
        // Check if QuaiMiner OS is available
        this.checkMinerAvailability();
        
        // Miner configuration modal
        const openConfigBtn = document.getElementById('openConfigBtn');
        const minerConfigModal = document.getElementById('minerConfigModal');
        const closeMinerConfigBtn = document.getElementById('closeMinerConfigBtn');
        const saveMinerConfigBtn = document.getElementById('saveMinerConfigBtn');
        const testMinerConfigBtn = document.getElementById('testMinerConfigBtn');
        
        if (openConfigBtn && minerConfigModal) {
            openConfigBtn.onclick = () => {
                minerConfigModal.style.display = 'block';
                this.loadMinerConfig();
            };
        }
        
        if (closeMinerConfigBtn && minerConfigModal) {
            closeMinerConfigBtn.onclick = () => {
                minerConfigModal.style.display = 'none';
            };
        }
        
        // Handle modal close on outside click (for both modals)
        window.addEventListener('click', (event) => {
            const settingsModal = document.getElementById('settingsModal');
            const minerConfigModal = document.getElementById('minerConfigModal');
            if (event.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
            if (event.target === minerConfigModal) {
                minerConfigModal.style.display = 'none';
            }
        });
        
        if (saveMinerConfigBtn) {
            saveMinerConfigBtn.onclick = () => this.saveMinerConfig();
        }
        
        if (testMinerConfigBtn) {
            testMinerConfigBtn.onclick = () => this.testMinerConfig();
        }
        
        // Remote control buttons
        const startMinerBtn = document.getElementById('startMinerBtn');
        const stopMinerBtn = document.getElementById('stopMinerBtn');
        const restartMinerBtn = document.getElementById('restartMinerBtn');
        const viewLogsBtn = document.getElementById('viewLogsBtn');
        
        if (startMinerBtn) startMinerBtn.onclick = () => this.controlMiner('start');
        if (stopMinerBtn) stopMinerBtn.onclick = () => this.controlMiner('stop');
        if (restartMinerBtn) restartMinerBtn.onclick = () => this.controlMiner('restart');
        if (viewLogsBtn) viewLogsBtn.onclick = () => this.viewMinerLogs();
        
        // Update miner status every 10 seconds (only if section is visible)
        this.minerStatusInterval = setInterval(() => {
            const section = document.getElementById('remoteManagementSection');
            if (section && section.style.display !== 'none' && !document.hidden) {
                this.updateMinerStatus();
            }
        }, 10000);
        this.updateMinerStatus();
    }
    
    /**
     * Check if QuaiMiner OS API is available
     */
    async checkMinerAvailability() {
        try {
            const response = await fetch('/api/miner/status');
            if (response.ok) {
                const section = document.getElementById('remoteManagementSection');
                if (section) section.style.display = 'block';
            }
        } catch (error) {
            // Miner API not available, hide remote management section
            const section = document.getElementById('remoteManagementSection');
            if (section) section.style.display = 'none';
        }
    }
    
    /**
     * Update miner status
     */
    async updateMinerStatus() {
        try {
            const response = await fetch('/api/miner/status');
            if (!response.ok) return;
            
            const status = await response.json();
            const statusDot = document.getElementById('minerStatusDot');
            const statusText = document.getElementById('minerStatusText');
            
            if (statusDot && statusText) {
                if (status.status === 'running') {
                    statusDot.className = 'status-dot-large running';
                    statusText.textContent = 'Running';
                } else {
                    statusDot.className = 'status-dot-large stopped';
                    statusText.textContent = status.status || 'Stopped';
                }
            }
        } catch (error) {
            console.error('Error updating miner status:', error);
        }
    }
    
    /**
     * Load miner configuration
     */
    async loadMinerConfig() {
        try {
            const response = await fetch('/api/miner/config');
            if (!response.ok) throw new Error('Failed to load config');
            
            const result = await response.json();
            if (!result.success || !result.config) return;
            
            const config = result.config;
            const stratumInput = document.getElementById('stratumAddress');
            const nodeRpcInput = document.getElementById('nodeRpcUrl');
            const walletInput = document.getElementById('walletAddress');
            const workerInput = document.getElementById('workerName');
            const autoStartInput = document.getElementById('autoStartMiner');
            
            if (stratumInput) stratumInput.value = config.miner?.stratum || '';
            if (nodeRpcInput) nodeRpcInput.value = config.node?.rpcUrl || '';
            if (walletInput) walletInput.value = config.miner?.wallet || '';
            if (workerInput) workerInput.value = config.miner?.worker || '';
            if (autoStartInput) autoStartInput.checked = config.autoStart !== false;
        } catch (error) {
            console.error('Error loading miner config:', error);
            this.showConfigError('Failed to load configuration: ' + error.message);
        }
    }
    
    /**
     * Save miner configuration
     */
    async saveMinerConfig() {
        const stratumInput = document.getElementById('stratumAddress');
        const nodeRpcInput = document.getElementById('nodeRpcUrl');
        const walletInput = document.getElementById('walletAddress');
        const workerInput = document.getElementById('workerName');
        const autoStartInput = document.getElementById('autoStartMiner');
        
        const updates = {
            stratum: stratumInput?.value || '',
            nodeRpcUrl: nodeRpcInput?.value || '',
            wallet: walletInput?.value || '',
            worker: workerInput?.value || '',
            autoStart: autoStartInput?.checked || false
        };
        
        try {
            const response = await fetch('/api/miner/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) throw new Error('Failed to save configuration');
            
            const result = await response.json();
            if (result.success) {
                this.showConfigSuccess('Configuration saved successfully!');
                this.updateMinerStatus();
            } else {
                this.showConfigError(result.error || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving miner config:', error);
            this.showConfigError('Failed to save configuration: ' + error.message);
        }
    }
    
    /**
     * Test miner configuration
     */
    async testMinerConfig() {
        const nodeRpcInput = document.getElementById('nodeRpcUrl');
        const rpcUrl = nodeRpcInput?.value || '';
        
        if (!rpcUrl) {
            this.showConfigError('Please enter a Node RPC URL');
            return;
        }
        
        try {
            const response = await fetch('/api/node/rpc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: 'eth_blockNumber',
                    params: []
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.result) {
                    const blockNum = parseInt(data.result, 16);
                    this.showConfigSuccess(`Connection successful! Current block: ${blockNum.toLocaleString()}`);
                } else {
                    this.showConfigError('Invalid response from node');
                }
            } else {
                this.showConfigError('Failed to connect to node');
            }
        } catch (error) {
            console.error('Error testing config:', error);
            this.showConfigError('Connection test failed: ' + error.message);
        }
    }
    
    /**
     * Control miner (start/stop/restart)
     */
    async controlMiner(action) {
        try {
            const response = await fetch(`/api/miner/${action}`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error(`Failed to ${action} miner`);
            
            const result = await response.json();
            if (result.success) {
                this.addLog(`Miner ${action}ed successfully`, 'success');
                setTimeout(() => this.updateMinerStatus(), 2000);
            } else {
                this.addLog(`Failed to ${action} miner: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error(`Error ${action}ing miner:`, error);
            this.addLog(`Error ${action}ing miner: ${error.message}`, 'error');
        }
    }
    
    /**
     * View miner logs
     */
    async viewMinerLogs() {
        const logsCard = document.getElementById('minerLogsCard');
        const logsContainer = document.getElementById('minerLogsContainer');
        
        if (!logsCard || !logsContainer) return;
        
        try {
            const response = await fetch('/api/miner/logs?lines=100');
            if (!response.ok) throw new Error('Failed to fetch logs');
            
            const result = await response.json();
            if (result.success) {
                logsContainer.textContent = result.logs || 'No logs available';
                logsCard.style.display = 'block';
            } else {
                logsContainer.textContent = 'Error: ' + (result.error || 'Failed to load logs');
                logsCard.style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching miner logs:', error);
            logsContainer.textContent = 'Error: ' + error.message;
            logsCard.style.display = 'block';
        }
    }
    
    /**
     * Show configuration error message
     */
    showConfigError(message) {
        const errorEl = document.getElementById('minerConfigError');
        const successEl = document.getElementById('minerConfigSuccess');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
        if (successEl) successEl.style.display = 'none';
    }
    
    /**
     * Show configuration success message
     */
    showConfigSuccess(message) {
        const errorEl = document.getElementById('minerConfigError');
        const successEl = document.getElementById('minerConfigSuccess');
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
        }
        if (errorEl) errorEl.style.display = 'none';
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired - initializing dashboard...');
    try {
        // Update loading status
        const loadingStatus = document.getElementById('loadingStatus');
        if (loadingStatus) {
            loadingStatus.textContent = 'Checking configuration...';
        }
        
        // Check if CONFIG is available
        if (typeof CONFIG === 'undefined') {
            console.error('ERROR: CONFIG is not defined! Make sure config.js loads before dashboard.js');
            if (loadingStatus) {
                loadingStatus.textContent = 'ERROR: CONFIG not defined. Check console (F12)';
                loadingStatus.style.color = '#FF0000';
            }
            return;
        }
        
        if (loadingStatus) {
            loadingStatus.textContent = 'Configuration loaded, creating dashboard...';
        }
        
        // Check if DashboardUtils is available
        if (typeof DashboardUtils === 'undefined') {
            console.warn('WARNING: DashboardUtils is not defined. Some features may not work.');
        }
        
        console.log('CONFIG loaded:', CONFIG);
        console.log('Creating MiningDashboard instance...');
        dashboard = new MiningDashboard();
        console.log('Dashboard initialized successfully!', dashboard);
    } catch (error) {
        console.error('ERROR initializing dashboard:', error);
        document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: Arial;"><h1>Initialization Error</h1><p>${error.message}</p><p>Check browser console (F12) for details.</p></div>`;
    }
});

// Also try immediate initialization if DOM is already loaded
if (document.readyState !== 'loading') {
    if (typeof CONFIG !== 'undefined') {
        try {
            dashboard = new MiningDashboard();
        } catch (error) {
            console.error('ERROR in immediate initialization:', error);
        }
    }
}

