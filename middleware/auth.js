/**
 * Authentication & RBAC Authorization Middleware
 */

/**
 * Extracts staff information from headers, body, or session
 */
const authenticate = (req, res, next) => {
    try {
        const staffRole = req.headers['x-staff-role'] || req.body?.staff_role || req.query?.staff_role;
        const staffId = req.headers['x-staff-id'] || req.body?.staff_id || req.query?.staff_id;

        req.staff = {
            staff_id: staffId ? Number(staffId) : null,
            role: staffRole ? String(staffRole).trim() : null
        };
        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication error: ' + error.message });
    }
};

/**
 * RBAC authorization middleware helper
 * Validates authenticated staff session against allowed roles.
 * @param  {...string} allowedRoles Allowed staff roles (e.g. 'Manager', 'Cashier', 'Washer', 'Folder', 'Rider')
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = (req.staff?.role || req.headers['x-staff-role'] || '').trim().toLowerCase();
        
        if (!userRole) {
            return res.status(401).json({ error: 'Unauthorized: Staff authentication required' });
        }

        const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRole);
        if (!isAllowed) {
            return res.status(403).json({ 
                error: `Forbidden: Action restricted to [${allowedRoles.join(', ')}]. Current role: ${req.staff?.role || req.headers['x-staff-role']}` 
            });
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorizeRoles
};
