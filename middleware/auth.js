const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticate = async (req, res, next) => {
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

    let payload;
    try {
        payload = jwt.verify(match[1], process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const staffId = Number(payload.staff_id);
    if (!Number.isSafeInteger(staffId) || staffId <= 0) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        const [rows] = await pool.query(`
            SELECT staff_id, role
            FROM staff
            WHERE staff_id = ?
              AND COALESCE(status, 'Active') = 'Active'
              AND (is_archived IS NULL OR is_archived = FALSE)
            LIMIT 1
        `, [staffId]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Account is inactive or no longer available' });
        }
        req.staff = { staff_id: Number(rows[0].staff_id), role: rows[0].role };
        return next();
    } catch (error) {
        return next(error);
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
