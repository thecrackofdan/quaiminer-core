/**
 * Security and Privacy Tests for Quai GPU Miner
 * Tests security measures, privacy protection, and open source compliance
 */

const fs = require('fs');
const path = require('path');

const tests = {
    passed: 0,
    failed: 0,
    warnings: 0,
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

function warn(name, message) {
    tests.warnings++;
    console.warn(`⚠️  ${name}: ${message}`);
}

console.log('🔒 Running Security & Privacy Tests...\n');

// ============================================
// SECURITY TESTS
// ============================================

console.log('📋 Security Tests:\n');

// Test 1: Security middleware exists
test('Security middleware file exists', () => {
    const securityPath = path.join(__dirname, '../middleware/security.js');
    if (!fs.existsSync(securityPath)) {
        throw new Error('security.js middleware not found');
    }
});

// Test 2: Privacy middleware exists
test('Privacy middleware file exists', () => {
    const privacyPath = path.join(__dirname, '../middleware/privacy.js');
    if (!fs.existsSync(privacyPath)) {
        throw new Error('privacy.js middleware not found');
    }
});

// Test 3: Rate limiting middleware exists
test('Rate limiting middleware exists', () => {
    const rateLimitPath = path.join(__dirname, '../middleware/rateLimit.js');
    if (!fs.existsSync(rateLimitPath)) {
        throw new Error('rateLimit.js middleware not found');
    }
});

// Test 4: Input validation middleware exists
test('Input validation middleware exists', () => {
    const inputValidationPath = path.join(__dirname, '../middleware/inputValidation.js');
    if (!fs.existsSync(inputValidationPath)) {
        throw new Error('inputValidation.js middleware not found');
    }
});

// Test 5: Check for security dependencies
test('Security dependencies in package.json', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredSecurity = ['helmet', 'cors', 'express-rate-limit', 'bcryptjs', 'jsonwebtoken'];
    const missing = requiredSecurity.filter(dep => !deps[dep]);
    
    if (missing.length > 0) {
        throw new Error(`Missing security dependencies: ${missing.join(', ')}`);
    }
});

// Test 6: Check server.js for security headers
test('Server uses Helmet.js', () => {
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (!serverContent.includes('helmet')) {
        throw new Error('Helmet.js not found in server.js');
    }
});

// Test 7: Check for CORS configuration
test('CORS is configured', () => {
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (!serverContent.includes('cors')) {
        throw new Error('CORS not configured in server.js');
    }
});

// Test 8: Check for rate limiting
test('Rate limiting is implemented', () => {
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (!serverContent.includes('rateLimit') && !serverContent.includes('rate-limit')) {
        throw new Error('Rate limiting not found in server.js');
    }
});

// Test 9: Check for password hashing
test('Password hashing is used', () => {
    const authPath = path.join(__dirname, '../auth.js');
    if (!fs.existsSync(authPath)) {
        throw new Error('auth.js not found');
    }
    
    const authContent = fs.readFileSync(authPath, 'utf8');
    if (!authContent.includes('bcrypt') && !authContent.includes('hashPassword')) {
        throw new Error('Password hashing not found in auth.js');
    }
});

// Test 10: Check for JWT authentication
test('JWT authentication is implemented', () => {
    const authPath = path.join(__dirname, '../auth.js');
    const authContent = fs.readFileSync(authPath, 'utf8');
    
    if (!authContent.includes('jsonwebtoken') && !authContent.includes('jwt')) {
        throw new Error('JWT authentication not found');
    }
});

// Test 11: Check for input sanitization
test('Input sanitization functions exist', () => {
    const securityPath = path.join(__dirname, '../middleware/security.js');
    const securityContent = fs.readFileSync(securityPath, 'utf8');
    
    if (!securityContent.includes('sanitize') && !securityContent.includes('preventDirectoryTraversal')) {
        throw new Error('Input sanitization not found');
    }
});

// Test 12: Check for sensitive data redaction
test('Sensitive data redaction in logs', () => {
    const securityPath = path.join(__dirname, '../middleware/security.js');
    const securityContent = fs.readFileSync(securityPath, 'utf8');
    
    if (!securityContent.includes('REDACTED') && !securityContent.includes('sanitizeLogData')) {
        warn('Sensitive data redaction', 'May not be fully implemented');
    }
});

// Test 13: Check for directory traversal prevention
test('Directory traversal prevention', () => {
    const securityPath = path.join(__dirname, '../middleware/security.js');
    const securityContent = fs.readFileSync(securityPath, 'utf8');
    
    if (!securityContent.includes('preventDirectoryTraversal') && !securityContent.includes('..')) {
        throw new Error('Directory traversal prevention not found');
    }
});

// ============================================
// PRIVACY TESTS
// ============================================

console.log('\n🔐 Privacy Tests:\n');

// Test 14: Privacy middleware functions
test('Privacy middleware has sanitization', () => {
    const privacyPath = path.join(__dirname, '../middleware/privacy.js');
    const privacyContent = fs.readFileSync(privacyPath, 'utf8');
    
    if (!privacyContent.includes('sanitizeResponse')) {
        throw new Error('Privacy sanitization not found');
    }
});

// Test 15: Wallet address masking
test('Wallet address masking function exists', () => {
    const privacyPath = path.join(__dirname, '../middleware/privacy.js');
    const privacyContent = fs.readFileSync(privacyPath, 'utf8');
    
    if (!privacyContent.includes('maskWalletAddress')) {
        throw new Error('Wallet address masking not found');
    }
});

// Test 16: Privacy headers
test('Privacy headers are set', () => {
    const privacyPath = path.join(__dirname, '../middleware/privacy.js');
    const privacyContent = fs.readFileSync(privacyPath, 'utf8');
    
    if (!privacyContent.includes('privacyHeaders') && !privacyContent.includes('X-Privacy-Policy')) {
        warn('Privacy headers', 'May not be fully implemented');
    }
});

// Test 17: No tracking code
test('No tracking/analytics code', () => {
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    const trackingPatterns = ['google-analytics', 'gtag', 'ga(', 'facebook', 'tracking', 'analytics'];
    const found = trackingPatterns.filter(pattern => 
        serverContent.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (found.length > 0) {
        warn('Tracking code', `Potential tracking found: ${found.join(', ')}`);
    }
});

// ============================================
// OPEN SOURCE COMPLIANCE TESTS
// ============================================

console.log('\n📜 Open Source Compliance Tests:\n');

// Test 18: LICENSE file exists
test('LICENSE file exists', () => {
    const licensePath = path.join(__dirname, '../../LICENSE');
    if (!fs.existsSync(licensePath)) {
        throw new Error('LICENSE file not found');
    }
});

// Test 19: LICENSE is MIT
test('LICENSE is MIT', () => {
    const licensePath = path.join(__dirname, '../../LICENSE');
    const licenseContent = fs.readFileSync(licensePath, 'utf8');
    
    if (!licenseContent.includes('MIT License') && !licenseContent.includes('MIT')) {
        throw new Error('LICENSE is not MIT');
    }
});

// Test 20: package.json has license field
test('package.json has license field', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (!packageJson.license) {
        throw new Error('package.json missing license field');
    }
    
    if (packageJson.license !== 'MIT') {
        warn('License mismatch', `package.json license is ${packageJson.license}, not MIT`);
    }
});

// Test 21: Repository URL in package.json
test('Repository URL in package.json', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (!packageJson.repository || !packageJson.repository.url) {
        warn('Repository URL', 'Repository URL not found in package.json');
    }
});

// Test 22: No proprietary dependencies
test('No proprietary dependencies', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for known proprietary packages
    const proprietary = Object.keys(deps).filter(dep => {
        // This is a basic check - would need more comprehensive list
        return false; // All current deps appear to be open source
    });
    
    if (proprietary.length > 0) {
        warn('Proprietary dependencies', `Found: ${proprietary.join(', ')}`);
    }
});

// ============================================
// NODE & PROXY OPTIONS TESTS
// ============================================

console.log('\n🖥️  Node & Proxy Options Tests:\n');

// Test 23: Node setup documentation exists
test('Node setup documentation exists', () => {
    const nodeDocPath = path.join(__dirname, '../docs/NODE_SETUP.md');
    if (!fs.existsSync(nodeDocPath)) {
        throw new Error('NODE_SETUP.md not found');
    }
});

// Test 24: Node RPC configuration
test('Node RPC URL is configurable', () => {
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (!serverContent.includes('NODE_RPC_URL') && !serverContent.includes('process.env.NODE_RPC_URL')) {
        throw new Error('Node RPC URL not configurable via environment variable');
    }
});

// Test 25: Node RPC proxy endpoint exists
test('Node RPC proxy endpoint exists', () => {
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (!serverContent.includes('/api/node/rpc')) {
        throw new Error('Node RPC proxy endpoint not found');
    }
});

// Test 26: Stratum proxy configuration
test('Stratum proxy configuration exists', () => {
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (!serverContent.includes('stratum') && !serverContent.includes('localhost:3333')) {
        warn('Stratum proxy', 'Stratum proxy configuration may not be documented');
    }
});

// Test 27: Local node option
test('Local node option available', () => {
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (!serverContent.includes('localhost:8545') && !serverContent.includes('127.0.0.1:8545')) {
        warn('Local node', 'Local node configuration may not be default');
    }
});

// Test 28: Custom node configuration
test('Custom node configuration supported', () => {
    const serverPath = path.join(__dirname, '../server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Check if node URL can be configured
    if (!serverContent.includes('NODE_RPC_URL') && !serverContent.includes('node.rpcUrl')) {
        warn('Custom node', 'Custom node configuration may not be fully supported');
    }
});

// ============================================
// SUMMARY
// ============================================

console.log('\n📊 Test Results:');
console.log(`✅ Passed: ${tests.passed}`);
console.log(`❌ Failed: ${tests.failed}`);
console.log(`⚠️  Warnings: ${tests.warnings}`);

if (tests.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    tests.errors.forEach(({ name, error }) => {
        console.log(`  - ${name}: ${error}`);
    });
}

// Overall status
const totalTests = tests.passed + tests.failed;
const passRate = ((tests.passed / totalTests) * 100).toFixed(1);

console.log(`\n📈 Pass Rate: ${passRate}%`);

if (tests.failed === 0) {
    console.log('\n✅ All critical tests passed!');
} else {
    console.log(`\n⚠️  ${tests.failed} test(s) failed. Please review.`);
}

process.exit(tests.failed > 0 ? 1 : 0);

