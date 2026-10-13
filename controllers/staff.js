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
        let { first_name, last_name, full_name, role = 'Staff', phone } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }

        if (!first_name) {
            return res.status(400).json({ error: 'First name is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO staff (first_name, last_name, role, phone) VALUES (?, ?, ?, ?)',
            [first_name, last_name || '', role, phone || '']
        );

        res.status(201).json({
            staff_id: result.insertId,
            first_name,
            last_name: last_name || '',
            full_name: `${first_name} ${last_name || ''}`.trim(),
            role,
            phone: phone || ''
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        let { first_name, last_name, full_name, role, phone } = req.body;
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
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email or username is required' });
        }

        const [staffList] = await pool.query(`
            SELECT 
                staff_id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) AS full_name,
                role,
                phone
            FROM staff
            ORDER BY staff_id ASC
        `);

        const matched = staffList.find(s => 
            email.toLowerCase().includes(s.first_name.toLowerCase()) || 
            email.toLowerCase().includes(s.last_name.toLowerCase())
        ) || staffList[0] || {
            staff_id: 1,
            full_name: 'Administrator',
            role: 'Manager'
        };

        res.json({
            success: true,
            staff: matched,
            message: `Welcome back, ${matched.full_name}!`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
