// QuaiMiner CORE Dashboard Configuration
// Declare CONFIG at global scope first
var CONFIG;

// Wrap in try-catch to catch any initialization errors
try {
CONFIG = {
    // Network Configuration
    network: {
        name: 'Quai Network',
        currency: 'QUAI',
        algorithm: 'ProgPoW',
        networkType: 'mainnet', // 'mainnet' or 'testnet'
        // Quai Network chain hierarchy:
        // - Prime Chain (Level 0): Main coordination chain
        // - Regions (Level 1): Multiple regions (typically 3)
        // - Zones (Level 2): Multiple zones per region (typically 3 per region)
        // For merged mining, you can mine multiple chains simultaneously
        chains: [
            { id: 0, name: 'Prime', enabled: true, level: 0 },
            { id: 1, name: 'Region 1', enabled: false, level: 1 },
            { id: 2, name: 'Region 2', enabled: false, level: 1 },
            { id: 3, name: 'Region 3', enabled: false, level: 1 }
            // Note: Zones are typically accessed through their parent Region
        ]
    },

    // Update interval in milliseconds
    updateInterval: 5000, // 5 seconds (default)
    // Available update intervals (in seconds)
    availableIntervals: [1, 2, 5, 10, 15, 30, 60],

    // Currency Display Configuration
    currencies: {
        available: [
            { code: 'QUAI', name: 'QUAI', symbol: 'QUAI', decimals: 6 },
            { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
            { code: 'EUR', name: 'Euro', symbol: 'EUR', decimals: 2 },
            { code: 'GBP', name: 'British Pound', symbol: 'GBP', decimals: 2 },
            { code: 'BTC', name: 'Bitcoin', symbol: 'BTC', decimals: 8 },
            { code: 'ETH', name: 'Ethereum', symbol: 'ETH', decimals: 6 }
        ],
        default: 'QUAI',
        // Exchange rates (can be updated from API)
        exchangeRates: {
            QUAI: 1.0,      // Base currency
            USD: 0.0,       // Will be fetched from QuaiSwap or API
            EUR: 0.0,
            GBP: 0.0,
            BTC: 0.0,
            ETH: 0.0
        }
    },

    // Quai Miner API Configuration
    api: {
        enabled: true, // Enabled for quai-gpu-miner solo mining via node RPC
        // For Quai GPU Miner (solo mining) - uses node RPC for mining stats
        // Node RPC should be on the same machine as your stratum server (192.168.2.110)
        url: 'http://192.168.2.110:8545', // Quai node RPC endpoint (same machine as stratum)
        // Alternative: If node RPC is on localhost, use: 'http://localhost:8545'
        // For Team Red Miner or other miners with API
        // url: 'http://localhost:4028/api', // Team Red Miner default API
        updateInterval: 5000, // API polling interval (ms)
        // Stratum proxy configuration (if using stratum/pool)
        // For testnet: Check TESTNET_POOLS.md for available testnet pools
        // For mainnet: See Quai Network docs for pool options
        // Format: stratum://POOL_HOST:PORT or stratum://POOL_HOST:PORT/WALLET_ADDRESS
        stratum: {
            enabled: true,
            url: 'stratum://192.168.2.110:3333', // Your local stratum proxy or pool URL
            host: '192.168.2.110',
            port: 3333,
            // Testnet pool example (if available):
            // url: 'stratum://testnet-pool.example.com:3333',
            // Mainnet pool examples:
            // url: 'stratum://quai.herominers.com:3333',
            // url: 'stratum://pool.alphapool.tech:3333',
        }
    },

    // GPU Configuration (Optimized for AMD RX 590 on Quai Network)
    gpus: [
        {
            id: 0,
            name: 'AMD RX 590',
            baseHashRate: 10.5, // Expected: 10-12 MH/s on Quai Network (ProgPoW)
            maxTemp: 85, // Maximum safe temperature
            targetTemp: 70, // Target operating temperature
            // Quai-specific OpenCL settings
            openclPlatform: 0,
            openclDevice: 0,
            workSize: 256,
            globalWorkSize: 8192
        }
        // Add more GPUs here if needed
        // {
        //     id: 1,
        //     name: 'AMD RX 580',
        //     baseHashRate: 9.5,
        //     maxTemp: 85,
        //     targetTemp: 70,
        //     openclPlatform: 0,
        //     openclDevice: 1,
        //     workSize: 256,
        //     globalWorkSize: 8192
        // }
    ],

    // Quai Network Mining Configuration
    mining: {
        // Mining mode: 'solo' or 'pool'
        mode: 'solo',
        
        // Share acceptance rate (0-1) - typical for Quai Network
        acceptanceRate: 0.95,
        
        // Earnings calculation (QUAI per MH/s per hour - adjust based on network difficulty)
        // This is an estimate - actual earnings depend on network difficulty and block rewards
        earningsPerMHPerHour: 0.0001,
        
        // Power consumption base (watts) - typical for RX 590 mining Quai
        basePowerConsumption: 150,
        
        // Merged mining configuration
        mergedMining: {
            enabled: false, // Enable to mine multiple Quai chains simultaneously
            chains: [0, 1, 2, 3] // Chain IDs to mine
        },
        
        // Workshares configuration (Quai's reward smoothing system)
        workshares: {
            enabled: true,
            // Workshares help smooth reward variance in solo mining
        }
    },

    // Chart Configuration
    charts: {
        // Number of data points to keep in history
        maxHistoryPoints: 60,
        
        // Chart animation duration
        animationDuration: 750
    },

    // Display Configuration
    display: {
        // Number of log entries to keep
        maxLogEntries: 50,
        
        // Temperature thresholds (optimized for RX 590)
        tempThresholds: {
            cool: 70,   // Below this is "cool"
            warm: 80,   // Between cool and warm
            hot: 85     // Above this is "hot"
        }
    },

    // Quai Node Configuration (for solo mining)
    node: {
        // RPC endpoint for Quai node
        // Note: Stratum is at 192.168.2.110:3333 (for miner connection)
        // Node RPC is on the same machine as stratum server for quai-gpu-miner solo mining
        rpcUrl: 'http://192.168.2.110:8545', // Quai node RPC (same machine as stratum server)
        // Alternative: If node RPC is on localhost, use: 'http://localhost:8545'
        // The test button will try multiple ports (8545, 8546, 8547, 8548) automatically
        
        // Peer Networking Ports (for node to function as a peer)
        // These ports must be open (TCP and UDP) for your node to connect to other peers
        // Reference: https://docs.v2.qu.ai/docs/participate/node/run-a-node/
        peerPorts: {
            // Level 0: Prime Chain
            prime: 30303,
            // Level 1: Regions
            cyprus: 30304,
            paxos: 30305,
            hydra: 30306,
            // Level 2: Zones
            cyprus1: 30307,  // [0 0]
            cyprus2: 30308,  // [0 1]
            cyprus3: 30309,  // [0 2]
            paxos1: 30310,   // [1 0]
            paxos2: 30311,   // [1 1]
            paxos3: 30312,   // [1 2]
            hydra1: 30313,   // [2 0]
            hydra2: 30314,   // [2 1]
            hydra3: 30315    // [2 2]
        },
        // Port range summary: 30303-30315 (TCP and UDP) must be open for peer connections
        // RPC port (8545) is typically localhost-only and doesn't need external access
        
        // Network configuration for peer connectivity
        networking: {
            // Enable NAT traversal (required if behind router/firewall)
            // Set ENABLE_NAT=true in network.env file
            enableNAT: false, // Set to true if using NAT/firewall
            
            // External IP address (required if ENABLE_NAT=true)
            // Set EXT_IP=Your_Public_IP_Address in network.env file
            externalIP: null, // Your public IP address (if behind NAT)
            
            // UPnP configuration (recommended for automatic port forwarding)
            // Enable UPnP on your router for automatic port management
            upnpEnabled: false // Set to true if UPnP is enabled on router
        },
        // Check if node is synced before mining
        requireSynced: true,
        // Enable real-time node metrics
        enableMetrics: true,
        // Update interval for node metrics (ms)
        metricsUpdateInterval: 10000, // 10 seconds
        // Prometheus integration (for Grafana data source)
        prometheus: {
            enabled: true, // Prometheus is running for Grafana
            url: 'http://localhost:9090', // Prometheus default port
            // Prometheus API endpoints
            queryEndpoint: '/api/v1/query',
            queryRangeEndpoint: '/api/v1/query_range',
            // Common Quai node metrics to query
            // IMPORTANT: Update these with actual metric names from go-quai
            // Repository: https://github.com/dominant-strategies/go-quai
            // Check: metrics_config/prometheus.yml for actual metric names
            // Or query Prometheus UI (http://localhost:9090) with: {__name__=~".*quai.*"}
            // Documentation: https://docs.v2.qu.ai/docs/participate/node/node-monitoring
            metrics: {
                // These are placeholder names - UPDATE with actual names from go-quai
                blockHeight: 'quai_block_height', // TODO: Update from go-quai/metrics_config/prometheus.yml
                difficulty: 'quai_difficulty',     // TODO: Update from go-quai/metrics_config/prometheus.yml
                blockTime: 'quai_block_time',      // TODO: Update from go-quai/metrics_config/prometheus.yml
                networkHashRate: 'quai_network_hashrate', // TODO: Update from go-quai/metrics_config/prometheus.yml
                peerCount: 'quai_peer_count',      // TODO: Update from go-quai/metrics_config/prometheus.yml
                syncStatus: 'quai_sync_status'     // TODO: Update from go-quai/metrics_config/prometheus.yml
            },
            // How to find actual metric names:
            // 1. Clone go-quai: git clone https://github.com/dominant-strategies/go-quai
            // 2. Check metrics_config/prometheus.yml
            // 3. Or query Prometheus: {__name__=~".*quai.*"}
            // 4. Update the metric names above
            updateInterval: 10000 // 10 seconds
        },
        // Grafana integration (if you want to query Grafana API directly)
        grafana: {
            enabled: false, // Set to true if you want to query Grafana API
            url: 'http://localhost:3000',
            // Grafana API endpoint for metrics (if available)
            apiPath: '/api/v1/query'
        }
    },

    // QuaiScan Integration
    // Official Documentation: https://docs.quaiscan.io
    // API Reference: https://docs.quaiscan.io/developer-support/api
    // Repository: Check QuaiScan documentation for latest API endpoints
    quaiscan: {
        enabled: true,
        // QuaiScan API base URL
        // Official API documentation: https://docs.quaiscan.io/developer-support/api
        apiUrl: 'https://api.quaiscan.io/api', // Mainnet - verify at docs.quaiscan.io
        // Alternative URLs for different networks (verify in QuaiScan docs):
        // apiUrl: 'https://api-testnet.quaiscan.io/api', // Testnet (if available)
        // apiUrl: 'https://api-devnet.quaiscan.io/api', // Devnet (if available)
        // GraphQL API: https://docs.quaiscan.io/developer-support/api/graphql
        graphqlUrl: 'https://api.quaiscan.io/graphql', // GraphQL endpoint (if available)
        // Update interval for QuaiScan data (ms)
        updateInterval: 30000, // 30 seconds
        // Features to enable
        features: {
            addressInfo: true,      // Address balance, transaction count
            transactionHistory: true, // Transaction history from QuaiScan
            blockInfo: true,        // Block information from QuaiScan
            networkStats: true      // Network statistics from QuaiScan
        },
        // Error handling
        retryAttempts: 3,
        retryDelay: 5000 // 5 seconds between retries
    },
    
    // Node RPC for Network Statistics (Primary Source)
    // Use go-quai RPC methods for network stats instead of external APIs
    // Repository: https://github.com/dominant-strategies/go-quai
    // Documentation: https://docs.v2.qu.ai
    // This is more reliable than external APIs
    nodeNetworkStats: {
        enabled: true,
        // Use the same RPC URL as node.rpcUrl
        // Methods: eth_blockNumber, net_peerCount, etc.
        updateInterval: 10000, // 10 seconds
        // Features
        features: {
            networkStats: true,     // Network hash rate, difficulty (from node)
            blockInfo: true,        // Latest block information (from node)
            chainData: true        // Chain-specific data (from node)
        }
    },
    
    // QuaiSwap Integration (DISABLED - Replaced with QuaiScan Metrics)
    // Website: https://quaiswap.io
    // Note: API endpoints may vary - check QuaiSwap documentation
    quaiswap: {
        enabled: false, // Disabled - using QuaiScan metrics instead
        // QuaiSwap API endpoint
        // Verify actual endpoint at quaiswap.io or Discord
        apiUrl: 'https://api.quaiswap.io', // Update with actual QuaiSwap API
        // Alternative: May use subgraph or direct contract queries
        // Check QuaiSwap documentation or Discord for latest API info
        updateInterval: 60000, // 60 seconds
        // Features
        features: {
            liquidity: true,        // Total liquidity pools
            volume: true,           // 24h trading volume
            swaps: true,            // Swap transaction count
            price: true             // QUAI token price
        },
        // Error handling
        retryAttempts: 2,
        retryDelay: 10000 // 10 seconds between retries
    },

    // Wallet Configuration (for reference)
    wallet: {
        // Your Pelagus wallet address for testing/reference
        // This will be automatically detected when you connect Pelagus wallet
        // Address: 0x00215254D1dDdd5D90671bA981688197A2735c1f
        testAddress: '0x00215254D1dDdd5D90671bA981688197A2735c1f'
    }
};

// Make CONFIG globally available (multiple ways for compatibility)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
// Also set as global variable
if (typeof globalThis !== 'undefined') {
    globalThis.CONFIG = CONFIG;
}

} catch (error) {
    console.error('ERROR initializing CONFIG:', error);
    console.error('Error details:', error.message, error.stack);
    // Create a minimal CONFIG to prevent complete failure
    CONFIG = {
        network: { name: 'Quai Network', currency: 'QUAI', algorithm: 'ProgPoW' },
        updateInterval: 5000,
        currencies: { available: [], default: 'QUAI', exchangeRates: {} },
        api: { enabled: false, url: 'http://localhost:8545', updateInterval: 5000, stratum: { enabled: false } },
        mining: { mode: 'solo', acceptanceRate: 0.95 },
        gpus: [],
        charts: { maxHistoryPoints: 60 },
        display: { maxLogEntries: 50, tempThresholds: { cool: 70, warm: 80, hot: 85 } },
        node: { rpcUrl: 'http://localhost:8545', enableMetrics: true, metricsUpdateInterval: 10000 }
    };
    if (typeof window !== 'undefined') {
        window.CONFIG = CONFIG;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.CONFIG = CONFIG;
    }
}

// Final verification
if (typeof CONFIG === 'undefined') {
    console.error('CRITICAL: CONFIG is still undefined after initialization!');
    throw new Error('CONFIG initialization failed');
}

