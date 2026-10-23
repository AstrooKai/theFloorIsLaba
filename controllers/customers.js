const pool = require('../config/db');

exports.getAllCustomers = async (req, res) => {
    try {
        const includeArchived = req.query.include_archived === 'true' || req.query.history === 'true';
        const archiveFilter = includeArchived ? '' : 'WHERE (is_archived IS NULL OR is_archived = FALSE)';

        const [rows] = await pool.query(`
            SELECT 
                customer_id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) AS full_name,
                phone,
                phone AS contact,
                street_address,
                street_address AS street,
                street_address AS address,
                barangay,
                COALESCE(status, 'Active') AS status,
                COALESCE(is_archived, FALSE) AS is_archived,
                created_at
            FROM customers
            ${archiveFilter}
            ORDER BY customer_id ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
                street_address,
                street_address AS street,
                street_address AS address,
                barangay,
                COALESCE(status, 'Active') AS status,
                COALESCE(is_archived, FALSE) AS is_archived,
                created_at
            FROM customers
            WHERE customer_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        let { first_name, last_name, full_name, phone, contact, street_address, street, barangay, address, status } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }
        const finalPhone = phone || contact || '';
        const rawStreet = street_address !== undefined ? street_address : (street !== undefined ? street : (address || ''));
        const finalStreetAddress = (rawStreet || '').trim();
        const finalBarangay = (barangay || '').trim();
        const finalStatus = status || 'Active';

        if (!first_name) {
            return res.status(400).json({ error: 'First name is required' });
        }

        if (!finalPhone || !finalPhone.trim()) {
            return res.status(400).json({ error: 'Contact number is required' });
        }
        if (/[a-zA-Z]/.test(finalPhone)) {
            return res.status(400).json({ error: 'Contact number cannot contain letters' });
        }
        if (!/^\+?[0-9\s-]+$/.test(finalPhone)) {
            return res.status(400).json({ error: 'Contact number cannot contain symbols' });
        }
        const phoneDigits = finalPhone.replace(/\D/g, '');
        if (phoneDigits.length !== 11) {
            return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number (e.g. 0917XXXXXXX)' });
        }
        if (!phoneDigits.startsWith('09')) {
            return res.status(400).json({ error: 'Contact number should start with 09 (e.g. 0917XXXXXXX)' });
        }

        const [result] = await pool.query(
            'INSERT INTO customers (first_name, last_name, phone, street_address, barangay, status, is_archived) VALUES (?, ?, ?, ?, ?, ?, FALSE)',
            [first_name, last_name || '', finalPhone, finalStreetAddress, finalBarangay, finalStatus]
        );

        res.status(201).json({
            customer_id: result.insertId,
            first_name,
            last_name: last_name || '',
            full_name: `${first_name} ${last_name || ''}`.trim(),
            phone: finalPhone,
            contact: finalPhone,
            street_address: finalStreetAddress,
            street: finalStreetAddress,
            address: finalStreetAddress,
            barangay: finalBarangay,
            status: finalStatus,
            is_archived: false
        });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        let { first_name, last_name, full_name, phone, contact, street_address, street, barangay, address, status, is_archived } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }

        const [existing] = await pool.query('SELECT * FROM customers WHERE customer_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const current = existing[0];
        const finalFirstName = first_name !== undefined ? first_name : current.first_name;
        const finalLastName = last_name !== undefined ? last_name : current.last_name;
        const finalPhone = (phone !== undefined ? phone : (contact !== undefined ? contact : current.phone)) || '';
        
        const inputStreet = street_address !== undefined ? street_address : (street !== undefined ? street : address);
        const finalStreetAddress = inputStreet !== undefined ? inputStreet.trim() : (current.street_address || '');
        const finalBarangay = barangay !== undefined ? barangay : (current.barangay || '');
        const finalStatus = status !== undefined ? status : (current.status || 'Active');
        const finalArchived = is_archived !== undefined ? Boolean(is_archived) : Boolean(current.is_archived);

        if (finalPhone) {
            if (/[a-zA-Z]/.test(finalPhone)) {
                return res.status(400).json({ error: 'Contact number cannot contain letters' });
            }
            if (!/^\+?[0-9\s-]+$/.test(finalPhone)) {
                return res.status(400).json({ error: 'Contact number cannot contain symbols' });
            }
            const phoneDigits = finalPhone.replace(/\D/g, '');
            if (phoneDigits.length !== 11) {
                return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number (e.g. 0917XXXXXXX)' });
            }
            if (!phoneDigits.startsWith('09')) {
                return res.status(400).json({ error: 'Contact number should start with 09 (e.g. 0917XXXXXXX)' });
            }
        }

        if (finalArchived && !current.is_archived) {
            const [activeOrders] = await pool.query(`
                SELECT o.order_id, os.status_name 
                FROM orders o 
                JOIN order_statuses os ON o.status_id = os.status_id 
                WHERE o.customer_id = ? AND os.status_name != 'Completed' AND o.is_archived = FALSE
            `, [id]);
            if (activeOrders.length > 0) {
                const orderList = activeOrders.map(o => `#${o.order_id} (${o.status_name})`).join(', ');
                return res.status(400).json({ 
                    error: `Cannot archive customer with active ongoing orders (${orderList}). Orders must be Completed before archiving.` 
                });
            }
        }

        await pool.query(
            'UPDATE customers SET first_name = ?, last_name = ?, phone = ?, street_address = ?, barangay = ?, status = ?, is_archived = ? WHERE customer_id = ?',
            [finalFirstName, finalLastName, finalPhone, finalStreetAddress, finalBarangay, finalStatus, finalArchived, id]
        );

        res.json({
            customer_id: Number(id),
            first_name: finalFirstName,
            last_name: finalLastName,
            full_name: `${finalFirstName} ${finalLastName}`.trim(),
            phone: finalPhone,
            contact: finalPhone,
            street_address: finalStreetAddress,
            street: finalStreetAddress,
            address: finalStreetAddress,
            barangay: finalBarangay,
            status: finalStatus,
            is_archived: finalArchived
        });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.archiveCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const [customerRows] = await pool.query('SELECT * FROM customers WHERE customer_id = ?', [id]);
        if (customerRows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        const [activeOrders] = await pool.query(`
            SELECT o.order_id, os.status_name 
            FROM orders o 
            JOIN order_statuses os ON o.status_id = os.status_id 
            WHERE o.customer_id = ? AND os.status_name != 'Completed' AND o.is_archived = FALSE
        `, [id]);

        if (activeOrders.length > 0) {
            const orderList = activeOrders.map(o => `#${o.order_id} (${o.status_name})`).join(', ');
            return res.status(400).json({ 
                error: `Cannot archive customer with active ongoing orders (${orderList}). Orders must be Completed before archiving.` 
            });
        }

        const [result] = await pool.query(
            "UPDATE customers SET is_archived = TRUE, status = 'Inactive' WHERE customer_id = ?",
            [id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Customer not found' });
        res.json({ success: true, message: 'Customer archived/deactivated successfully', customer_id: Number(id) });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.unarchiveCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            "UPDATE customers SET is_archived = FALSE, status = 'Active' WHERE customer_id = ?",
            [id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Customer not found' });
        res.json({ success: true, message: 'Customer reactivated successfully', customer_id: Number(id) });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
            return res.status(400).json({ error: 'Cannot delete customer with existing orders. Please archive instead.' });
        }
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
