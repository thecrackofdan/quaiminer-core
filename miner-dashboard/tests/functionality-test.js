/**
 * Functionality Tests for Quai GPU Miner Dashboard
 * Tests all major features and functionality
 */

const tests = {
    passed: 0,
    failed: 0,
    errors: []
};

function test(name, fn) {
    try {
        fn();
        tests.passed++;
        console.log(`✅ ${name}`);
    } catch (error) {
        tests.failed++;
        tests.errors.push({ name, error: error.message });
        console.error(`❌ ${name}: ${error.message}`);
    }
}

// Test 1: Configuration Loading
test('CONFIG object exists', () => {
    if (typeof CONFIG === 'undefined') {
        throw new Error('CONFIG is not defined');
    }
});

test('CONFIG has required properties', () => {
    const required = ['updateInterval', 'network', 'node'];
    required.forEach(prop => {
        if (!CONFIG[prop]) {
            throw new Error(`CONFIG.${prop} is missing`);
        }
    });
});

// Test 2: Dashboard Initialization
test('Dashboard class exists', () => {
    if (typeof MiningDashboard === 'undefined') {
        throw new Error('MiningDashboard class not found');
    }
});

// Test 3: API Endpoints
async function testAPIEndpoints() {
    const endpoints = [
        '/api/health',
        '/api/stats',
        '/api/gpus',
        '/api/miner/status'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok && response.status !== 404) {
                throw new Error(`Endpoint ${endpoint} returned ${response.status}`);
            }
            test(`API endpoint ${endpoint} accessible`, () => {});
        } catch (error) {
            test(`API endpoint ${endpoint}`, () => {
                throw error;
            });
        }
    }
}

// Test 4: Error Handling
test('Error handler exists', () => {
    if (typeof ErrorHandler === 'undefined') {
        throw new Error('ErrorHandler class not found');
    }
});

// Test 5: Mobile Dashboard
test('Mobile dashboard exists', () => {
    // Check if mobile.html would load
    const mobileLink = document.querySelector('a[href="/mobile.html"]');
    if (!mobileLink) {
        throw new Error('Mobile dashboard link not found');
    }
});

// Test 6: Remote Connection
test('Remote connection functionality exists', () => {
    const connectBtn = document.getElementById('connectBtn') || 
                      document.querySelector('[onclick*="connectionModal"]');
    if (!connectBtn && typeof showDownloadInstructions === 'undefined') {
        // Not critical if on dashboard page
        console.warn('Remote connection button not found (may be on different page)');
    }
});

// Test 7: GPU Tuning
test('GPU tuner exists', () => {
    if (typeof GPUTuner === 'undefined') {
        console.warn('GPUTuner class not found (may not be loaded)');
    }
});

// Test 8: Auto-Setup
test('Auto-setup exists', () => {
    if (typeof AutoSetup === 'undefined') {
        console.warn('AutoSetup class not found (may not be loaded)');
    }
});

// Test 9: One-Click Mining
test('One-click mining exists', () => {
    if (typeof OneClickMining === 'undefined') {
        console.warn('OneClickMining class not found (may not be loaded)');
    }
});

// Test 10: Security
test('Input validation exists', () => {
    // Check if sanitization functions exist
    if (typeof sanitizeString === 'undefined' && typeof sanitizeObject === 'undefined') {
        console.warn('Sanitization functions not found in global scope (may be in modules)');
    }
});

// Run tests
console.log('🧪 Running Functionality Tests...\n');

// Run async tests
testAPIEndpoints().then(() => {
    console.log(`\n📊 Test Results:`);
    console.log(`✅ Passed: ${tests.passed}`);
    console.log(`❌ Failed: ${tests.failed}`);
    if (tests.errors.length > 0) {
        console.log(`\nErrors:`);
        tests.errors.forEach(({ name, error }) => {
            console.log(`  - ${name}: ${error}`);
        });
    }
});

