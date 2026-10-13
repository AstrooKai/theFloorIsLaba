const pool = require('../config/db');

exports.getAllCustomers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                customer_id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) AS full_name,
                phone,
                phone AS contact,
                address,
                'Active' AS status,
                created_at
            FROM customers
            ORDER BY customer_id ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT 
                customer_id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) AS full_name,
                phone,
                phone AS contact,
                address,
                'Active' AS status,
                created_at
            FROM customers
            WHERE customer_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        let { first_name, last_name, full_name, phone, contact, address } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }
        const finalPhone = phone || contact || '';
        const finalAddress = address || '';

        if (!first_name) {
            return res.status(400).json({ error: 'First name or full name is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO customers (first_name, last_name, phone, address) VALUES (?, ?, ?, ?)',
            [first_name, last_name || '', finalPhone, finalAddress]
        );

        res.status(201).json({
            customer_id: result.insertId,
            first_name,
            last_name: last_name || '',
            full_name: `${first_name} ${last_name || ''}`.trim(),
            phone: finalPhone,
            contact: finalPhone,
            address: finalAddress,
            status: 'Active'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        let { first_name, last_name, full_name, phone, contact, address } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }
        const finalPhone = phone || contact || '';
        const finalAddress = address || '';

        const [result] = await pool.query(
            'UPDATE customers SET first_name = ?, last_name = ?, phone = ?, address = ? WHERE customer_id = ?',
            [first_name, last_name || '', finalPhone, finalAddress, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({
            customer_id: Number(id),
            first_name,
            last_name: last_name || '',
            full_name: `${first_name} ${last_name || ''}`.trim(),
            phone: finalPhone,
            contact: finalPhone,
            address: finalAddress,
            status: 'Active'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM customers WHERE customer_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ message: 'Customer deleted successfully', customer_id: Number(id) });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete customer with existing orders' });
        }
        res.status(500).json({ error: error.message });
    }
};
