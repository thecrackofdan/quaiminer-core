/**
 * Security Middleware
 * Additional security measures for Quai GPU Miner
 */

/**
 * Remove sensitive data from request logs
 */
function sanitizeLogData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    const sensitiveKeys = ['password', 'apiKey', 'token', 'secret', 'privateKey', 'wallet'];
    const sanitized = { ...data };
    
    for (const key of sensitiveKeys) {
        if (sanitized[key]) {
            sanitized[key] = '***REDACTED***';
        }
    }
    
    return sanitized;
}

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
}

/**
 * Request logging with sensitive data redaction
 */
function secureRequestLogger(req, res, next) {
    // Log request without sensitive data
    const logData = {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
    };
    
    // Don't log sensitive endpoints
    const sensitivePaths = ['/api/auth/login', '/api/auth/register'];
    if (!sensitivePaths.includes(req.path)) {
        console.log('Request:', logData);
    }
    
    next();
}

/**
 * Validate request origin
 */
function validateOrigin(req, res, next) {
    // In production, validate origin
    if (process.env.NODE_ENV === 'production') {
        const origin = req.get('origin');
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        
        if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
            return res.status(403).json({ error: 'Origin not allowed' });
        }
    }
    
    next();
}

/**
 * Prevent directory traversal
 */
function preventDirectoryTraversal(path) {
    if (!path || typeof path !== 'string') {
        return false;
    }
    
    // Check for directory traversal patterns
    if (path.includes('..') || path.includes('//') || path.startsWith('/')) {
        return false;
    }
    
    return true;
}

/**
 * Sanitize file path
 */
function sanitizeFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return null;
    }
    
    // Remove any directory traversal attempts
    let sanitized = filePath.replace(/\.\./g, '').replace(/\/\//g, '/');
    
    // Remove leading slashes
    sanitized = sanitized.replace(/^\/+/, '');
    
    // Only allow alphanumeric, dash, underscore, dot, and forward slash
    if (!/^[a-zA-Z0-9_\-./]+$/.test(sanitized)) {
        return null;
    }
    
    return sanitized;
}

module.exports = {
    sanitizeLogData,
    securityHeaders,
    secureRequestLogger,
    validateOrigin,
    preventDirectoryTraversal,
    sanitizeFilePath
};

