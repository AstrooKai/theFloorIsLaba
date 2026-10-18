const pool = require('../config/db');
const bcrypt = require('bcryptjs');

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
                COALESCE(status, 'Active') AS status,
                COALESCE(is_archived, FALSE) AS is_archived,
                created_at
            FROM staff
            ${archiveFilter}
            ORDER BY staff_id ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
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
                COALESCE(status, 'Active') AS status,
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
        res.status(500).json({ error: error.message });
    }
};

exports.createStaff = async (req, res) => {
    try {
        let { first_name, last_name, full_name, role = 'Staff', email, password = 'password123', phone, status = 'Active' } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }

        if (!first_name) {
            return res.status(400).json({ error: 'First name is required' });
        }

        const finalEmail = (email || `${first_name.toLowerCase()}.${(last_name || 'staff').toLowerCase()}@laba.ph`).trim().toLowerCase();
        const hashedPassword = await bcrypt.hash(password || 'password123', 10);

        const [result] = await pool.query(
            'INSERT INTO staff (first_name, last_name, role, email, password, phone, status, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)',
            [first_name, last_name || '', role, finalEmail, hashedPassword, phone || '', status || 'Active']
        );

        res.status(201).json({
            staff_id: result.insertId,
            first_name,
            last_name: last_name || '',
            full_name: `${first_name} ${last_name || ''}`.trim(),
            role,
            email: finalEmail,
            phone: phone || '',
            status: status || 'Active',
            is_archived: false
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
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
            updates.push('role = ?');
            params.push(role);
        }
        if (email) {
            updates.push('email = ?');
            params.push(email.trim().toLowerCase());
        }
        if (password && password.trim()) {
            const hashedPassword = await bcrypt.hash(password.trim(), 10);
            updates.push('password = ?');
            params.push(hashedPassword);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            params.push(phone);
        }
        if (status) {
            updates.push('status = ?');
            params.push(status);
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
            status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.archiveStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            "UPDATE staff SET is_archived = TRUE, status = 'Inactive' WHERE staff_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json({ message: 'Staff member archived successfully', staff_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
};

exports.toggleStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT status FROM staff WHERE staff_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }
        const currentStatus = rows[0].status || 'Active';
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        await pool.query('UPDATE staff SET status = ? WHERE staff_id = ?', [newStatus, id]);
        res.json({ success: true, staff_id: Number(id), status: newStatus });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        // Soft-archive by default to safeguard historical orders and delivery run references
        const [result] = await pool.query("UPDATE staff SET is_archived = TRUE, status = 'Inactive' WHERE staff_id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json({ message: 'Staff member archived successfully', staff_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

        if (staffMember.status === 'Inactive' || staffMember.is_archived) {
            return res.status(401).json({ error: 'Account is deactivated. Please contact your manager.' });
        }

        let isMatch = false;

        if (staffMember.password.startsWith('$2a$') || staffMember.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, staffMember.password);
        } else {
            isMatch = (password === staffMember.password);
            if (isMatch) {
                const newHash = await bcrypt.hash(password, 10);
                await pool.query('UPDATE staff SET password = ? WHERE staff_id = ?', [newHash, staffMember.staff_id]);
            }
        }

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        delete staffMember.password;

        res.json({
            success: true,
            staff: staffMember,
            message: `Welcome back, ${staffMember.full_name}!`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
