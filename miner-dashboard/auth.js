// Authentication module for Quai GPU Miner
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { users } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate API key
function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}

// Hash password
async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

// Verify password
async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Create default admin user if none exists
async function createDefaultUser() {
    const existingUser = users.findByUsername('admin');
    if (!existingUser) {
        // SECURITY: Generate random password if not set, don't use 'admin'
        const defaultPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
        const passwordHash = await hashPassword(defaultPassword);
        const apiKey = generateApiKey();
        users.create('admin', passwordHash, apiKey);
        
        // SECURITY: Only log credentials in development, warn in production
        if (process.env.NODE_ENV === 'development') {
            console.log('⚠️  Default admin user created:');
            console.log('   Username: admin');
            console.log('   Password:', process.env.ADMIN_PASSWORD ? '(from env)' : defaultPassword);
            console.log('   API Key:', apiKey);
        } else {
            console.log('⚠️  SECURITY WARNING: Default admin user created');
            console.log('   Username: admin');
            console.log('   Password: Set ADMIN_PASSWORD environment variable or check database');
            console.log('   ⚠️  CHANGE DEFAULT CREDENTIALS IMMEDIATELY IN PRODUCTION!');
            console.log('   Run: quaiminer-setup --change-admin-password');
        }
    }
}

// Authentication middleware
function authenticate(req, res, next) {
    // Check for API key in header
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    if (apiKey) {
        const user = users.findByApiKey(apiKey);
        if (user) {
            req.user = user;
            users.updateLastLogin(user.id);
            return next();
        }
    }

    // Check for JWT token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (decoded) {
            const user = users.findByUsername(decoded.username);
            if (user) {
                req.user = user;
                users.updateLastLogin(user.id);
                return next();
            }
        }
    }

    // Check for session (if using sessions)
    if (req.session && req.session.userId) {
        const user = users.findByUsername(req.session.username);
        if (user) {
            req.user = user;
            return next();
        }
    }

    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
}

// Optional authentication (doesn't fail if not authenticated)
function optionalAuth(req, res, next) {
    // SECURITY: Only check API key in header
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        // SECURITY: Validate API key format
        if (typeof apiKey === 'string' && apiKey.length >= 32 && apiKey.length <= 128) {
            const user = users.findByApiKey(apiKey);
            if (user) {
                req.user = user;
                users.updateLastLogin(user.id);
            }
        }
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (decoded) {
            const user = users.findByUsername(decoded.username);
            if (user) {
                req.user = user;
            }
        }
    }

    next();
}

module.exports = {
    generateApiKey,
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    createDefaultUser,
    authenticate,
    optionalAuth,
    JWT_SECRET
};

