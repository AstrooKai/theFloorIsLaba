const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    if (!req.path.startsWith('/api') ||
        req.path === '/api/health' ||
        (req.method === 'POST' && req.path === '/api/staff/login')) {
        return next();
    }

    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match || !process.env.JWT_SECRET) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(match[1], process.env.JWT_SECRET);
        const staffId = Number(payload.staff_id);
        if (!Number.isSafeInteger(staffId) || staffId <= 0 || typeof payload.role !== 'string') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        req.staff = { staff_id: staffId, role: payload.role };
        return next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
    const userRole = req.staff?.role;
    if (!userRole) {
        return res.status(401).json({ error: 'Staff authentication required' });
    }

    if (!allowedRoles.some(role => role.toLowerCase() === userRole.toLowerCase())) {
        return res.status(403).json({ error: `Action restricted to ${allowedRoles.join(', ')}` });
    }
    return next();
};

module.exports = { authenticate, authorizeRoles };
