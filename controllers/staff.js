const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const STAFF_ROLES = ['Manager', 'Cashier', 'Washer', 'Folder', 'Rider'];

// Check if a staff member is the sole active manager
async function isSoleActiveManager(targetStaffId, requesterStaffId = null) {
    const [targetRows] = await pool.query(
        "SELECT staff_id, role, status, is_archived FROM staff WHERE staff_id = ?",
        [targetStaffId]
    );
    if (targetRows.length === 0) return false;
    const target = targetRows[0];
    const isTargetManager = String(target.role || '').toLowerCase() === 'manager';
    if (!isTargetManager) return false;

    const [countRows] = await pool.query(`
        SELECT COUNT(*) AS total 
        FROM staff 
        WHERE LOWER(role) = 'manager' 
          AND (is_archived IS NULL OR is_archived = FALSE)
          AND (status IS NULL OR status = 'Active')
    `);
    const totalActiveManagers = countRows[0]?.total || 0;

    if (totalActiveManagers <= 1) {
        if (requesterStaffId) {
            return Number(requesterStaffId) === Number(targetStaffId);
        }
        return true;
    }
    return false;
}

exports.getAllStaff = async (req, res) => {
    try {
        const includeArchived = req.query.include_archived === 'true' || req.query.history === 'true';
        const archiveFilter = includeArchived ? '' : 'WHERE (is_archived IS NULL OR is_archived = FALSE)';

        const [rows] = await pool.query(`
            SELECT 
                staff_id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) AS full_name,
                role,
                email,
                phone,
                CASE WHEN status = 'Inactive' THEN 'Deactivated' ELSE COALESCE(status, 'Active') END AS status,
                COALESCE(is_archived, FALSE) AS is_archived,
                created_at
            FROM staff
            ${archiveFilter}
            ORDER BY staff_id ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getRiders = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                staff_id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) AS full_name,
                role,
                email,
                phone
            FROM staff
            WHERE LOWER(role) = 'rider'
              AND (is_archived IS NULL OR is_archived = FALSE)
              AND (status IS NULL OR status = 'Active')
            ORDER BY staff_id ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getStaffById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT 
                staff_id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) AS full_name,
                role,
                email,
                phone,
                CASE WHEN status = 'Inactive' THEN 'Deactivated' ELSE COALESCE(status, 'Active') END AS status,
                COALESCE(is_archived, FALSE) AS is_archived,
                created_at
            FROM staff
            WHERE staff_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createStaff = async (req, res) => {
    try {
        let { first_name, last_name, full_name, role, email, password, phone } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }

        if (!first_name) {
            return res.status(400).json({ error: 'First name is required' });
        }
        if (!STAFF_ROLES.includes(role)) {
            return res.status(400).json({ error: 'Please select a valid staff role' });
        }
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        if (phone) {
            if (/[a-zA-Z]/.test(phone)) {
                return res.status(400).json({ error: 'Contact number cannot contain letters' });
            }
            if (!/^\+?[0-9\s-]+$/.test(phone)) {
                return res.status(400).json({ error: 'Contact number cannot contain symbols' });
            }
            const phoneDigits = phone.replace(/\D/g, '');
            if (phoneDigits.length !== 11) {
                return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number (e.g. 0917XXXXXXX)' });
            }
            if (!phoneDigits.startsWith('09')) {
                return res.status(400).json({ error: 'Contact number should start with 09 (e.g. 0917XXXXXXX)' });
            }
        }

        const finalEmail = (email || `${first_name.toLowerCase()}.${(last_name || 'staff').toLowerCase()}@laba.ph`).trim().toLowerCase();

        // Check for duplicate email
        const [existingEmail] = await pool.query(
            'SELECT staff_id FROM staff WHERE LOWER(email) = LOWER(?)',
            [finalEmail]
        );
        if (existingEmail.length > 0) {
            return res.status(400).json({
                error: 'A staff member with this email address already exists. Please use a unique email.',
                field: 'email'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Initial status: Active
        const [result] = await pool.query(
            'INSERT INTO staff (first_name, last_name, role, email, password, phone, status, is_archived) VALUES (?, ?, ?, ?, ?, ?, "Active", FALSE)',
            [first_name, last_name || '', role, finalEmail, hashedPassword, phone || '']
        );

        res.status(201).json({
            staff_id: result.insertId,
            first_name,
            last_name: last_name || '',
            full_name: `${first_name} ${last_name || ''}`.trim(),
            role,
            email: finalEmail,
            phone: phone || '',
            status: 'Active',
            is_archived: false
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(400).json({
                error: 'A staff member with this email address already exists. Please use a unique email.',
                field: 'email'
            });
        }
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.staff?.staff_id;
        if (await isSoleActiveManager(id, requesterId)) {
            return res.status(400).json({ error: 'A manager cannot edit their own account when they are the only manager.' });
        }
        let { first_name, last_name, full_name, role, email, password, phone, status } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }

        const updates = [];
        const params = [];

        if (first_name) {
            updates.push('first_name = ?');
            params.push(first_name);
        }
        if (last_name !== undefined) {
            updates.push('last_name = ?');
            params.push(last_name);
        }
        if (role) {
            if (!STAFF_ROLES.includes(role)) {
                return res.status(400).json({ error: 'Please select a valid staff role' });
            }
            updates.push('role = ?');
            params.push(role);
        }
        if (email) {
            const cleanEmail = email.trim().toLowerCase();
            const [existingEmail] = await pool.query(
                'SELECT staff_id FROM staff WHERE LOWER(email) = LOWER(?) AND staff_id != ?',
                [cleanEmail, id]
            );
            if (existingEmail.length > 0) {
                return res.status(400).json({
                    error: 'A staff member with this email address already exists. Please use a unique email.',
                    field: 'email'
                });
            }
            updates.push('email = ?');
            params.push(cleanEmail);
        }
        if (password && password.trim()) {
            if (password.trim().length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long' });
            }
            const hashedPassword = await bcrypt.hash(password.trim(), 10);
            updates.push('password = ?');
            params.push(hashedPassword);
        }
        if (phone !== undefined) {
            if (phone) {
                if (/[a-zA-Z]/.test(phone)) {
                    return res.status(400).json({ error: 'Contact number cannot contain letters' });
                }
                if (!/^\+?[0-9\s-]+$/.test(phone)) {
                    return res.status(400).json({ error: 'Contact number cannot contain symbols' });
                }
                const phoneDigits = phone.replace(/\D/g, '');
                if (phoneDigits.length !== 11) {
                    return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number (e.g. 0917XXXXXXX)' });
                }
                if (!phoneDigits.startsWith('09')) {
                    return res.status(400).json({ error: 'Contact number should start with 09 (e.g. 0917XXXXXXX)' });
                }
            }
            updates.push('phone = ?');
            params.push(phone);
        }
        if (status) {
            const normStatus = status === 'Inactive' ? 'Deactivated' : status;
            updates.push('status = ?');
            params.push(normStatus);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

        params.push(id);
        const [result] = await pool.query(`UPDATE staff SET ${updates.join(', ')} WHERE staff_id = ?`, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json({
            staff_id: Number(id),
            first_name,
            last_name,
            full_name: first_name ? `${first_name} ${last_name || ''}`.trim() : undefined,
            role,
            email,
            phone,
            status: status === 'Inactive' ? 'Deactivated' : status
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(400).json({
                error: 'A staff member with this email address already exists. Please use a unique email.',
                field: 'email'
            });
        }
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.archiveStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.staff?.staff_id;
        if (await isSoleActiveManager(id, requesterId)) {
            return res.status(400).json({ error: 'A manager cannot change the status of their own account when they are the only manager.' });
        }
        const [result] = await pool.query(
            "UPDATE staff SET is_archived = TRUE, status = 'Deactivated' WHERE staff_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json({ message: 'Staff member archived successfully', staff_id: Number(id) });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.unarchiveStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            "UPDATE staff SET is_archived = FALSE, status = 'Active' WHERE staff_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json({ success: true, message: 'Staff member unarchived successfully', staff_id: Number(id) });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.toggleStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.staff?.staff_id;
        if (await isSoleActiveManager(id, requesterId)) {
            return res.status(400).json({ error: 'A manager cannot change the status of their own account when they are the only manager.' });
        }
        const [rows] = await pool.query('SELECT status FROM staff WHERE staff_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        const currentStatus = rows[0].status || 'Active';
        const newStatus = currentStatus === 'Active' ? 'Deactivated' : 'Active';
        await pool.query('UPDATE staff SET status = ? WHERE staff_id = ?', [newStatus, id]);
        res.json({ success: true, staff_id: Number(id), status: newStatus });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.staff?.staff_id;
        if (await isSoleActiveManager(id, requesterId)) {
            return res.status(400).json({ error: 'A manager cannot change the status of their own account when they are the only manager.' });
        }
        // Soft-archive staff
        const [result] = await pool.query("UPDATE staff SET is_archived = TRUE, status = 'Deactivated' WHERE staff_id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json({ message: 'Staff member archived successfully', staff_id: Number(id) });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.loginStaff = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [rows] = await pool.query(`
            SELECT 
                staff_id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) AS full_name,
                role,
                email,
                password,
                phone,
                COALESCE(status, 'Active') AS status,
                COALESCE(is_archived, FALSE) AS is_archived
            FROM staff
            WHERE LOWER(email) = LOWER(?)
        `, [email.trim()]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const staffMember = rows[0];

        if (staffMember.status === 'Inactive' || staffMember.status === 'Deactivated' || staffMember.is_archived) {
            return res.status(401).json({ error: 'Account is deactivated. Please contact your manager.' });
        }

        const isMatch = await bcrypt.compare(password, staffMember.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        delete staffMember.password;
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');
            return res.status(500).json({ error: 'Internal server error' });
        }
        const token = jwt.sign(
            { staff_id: staffMember.staff_id, role: staffMember.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            staff: staffMember,
            token,
            message: `Welcome back, ${staffMember.full_name}!`
        });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
