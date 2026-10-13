const pool = require('../config/db');

exports.getAllStaff = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                staff_id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) AS full_name,
                role,
                email,
                phone,
                created_at
            FROM staff
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
        let { first_name, last_name, full_name, role = 'Staff', email, password = 'password123', phone } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }

        if (!first_name) {
            return res.status(400).json({ error: 'First name is required' });
        }

        const finalEmail = (email || `${first_name.toLowerCase()}.${(last_name || 'staff').toLowerCase()}@laba.ph`).trim().toLowerCase();

        const [result] = await pool.query(
            'INSERT INTO staff (first_name, last_name, role, email, password, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [first_name, last_name || '', role, finalEmail, password, phone || '']
        );

        res.status(201).json({
            staff_id: result.insertId,
            first_name,
            last_name: last_name || '',
            full_name: `${first_name} ${last_name || ''}`.trim(),
            role,
            email: finalEmail,
            phone: phone || ''
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        let { first_name, last_name, full_name, role, email, password, phone } = req.body;
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
        if (password) {
            updates.push('password = ?');
            params.push(password);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            params.push(phone);
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
            phone
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM staff WHERE staff_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json({ message: 'Staff member deleted successfully', staff_id: Number(id) });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete staff member assigned to existing orders' });
        }
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
                phone
            FROM staff
            WHERE LOWER(email) = LOWER(?) AND password = ?
        `, [email.trim(), password]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const staffMember = rows[0];

        res.json({
            success: true,
            staff: staffMember,
            message: `Welcome back, ${staffMember.full_name}!`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
