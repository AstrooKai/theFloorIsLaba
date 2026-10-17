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
                street,
                barangay,
                address,
                COALESCE(status, 'Active') AS status,
                COALESCE(is_archived, FALSE) AS is_archived,
                created_at
            FROM customers
            ${archiveFilter}
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
                street,
                barangay,
                address,
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
        res.status(500).json({ error: error.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        let { first_name, last_name, full_name, phone, contact, street, barangay, address, status } = req.body;
        if (!first_name && full_name) {
            const parts = full_name.trim().split(/\s+/);
            first_name = parts[0] || '';
            last_name = parts.slice(1).join(' ') || '';
        }
        const finalPhone = phone || contact || '';
        const finalStreet = (street || '').trim();
        const finalBarangay = (barangay || '').trim();
        const finalAddress = address || (finalStreet && finalBarangay ? `${finalStreet}, ${finalBarangay}` : (finalStreet || finalBarangay || 'Cabuyao, Laguna'));
        const finalStatus = status || 'Active';

        if (!first_name) {
            return res.status(400).json({ error: 'First name is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO customers (first_name, last_name, phone, street, barangay, address, status, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)',
            [first_name, last_name || '', finalPhone, finalStreet, finalBarangay, finalAddress, finalStatus]
        );

        res.status(201).json({
            customer_id: result.insertId,
            first_name,
            last_name: last_name || '',
            full_name: `${first_name} ${last_name || ''}`.trim(),
            phone: finalPhone,
            contact: finalPhone,
            street: finalStreet,
            barangay: finalBarangay,
            address: finalAddress,
            status: finalStatus,
            is_archived: false
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        let { first_name, last_name, full_name, phone, contact, street, barangay, address, status, is_archived } = req.body;
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
        const finalStreet = street !== undefined ? street : (current.street || '');
        const finalBarangay = barangay !== undefined ? barangay : (current.barangay || '');
        const finalAddress = address !== undefined ? address : (finalStreet && finalBarangay ? `${finalStreet}, ${finalBarangay}` : current.address);
        const finalStatus = status !== undefined ? status : (current.status || 'Active');
        const finalArchived = is_archived !== undefined ? Boolean(is_archived) : Boolean(current.is_archived);

        await pool.query(
            'UPDATE customers SET first_name = ?, last_name = ?, phone = ?, street = ?, barangay = ?, address = ?, status = ?, is_archived = ? WHERE customer_id = ?',
            [finalFirstName, finalLastName, finalPhone, finalStreet, finalBarangay, finalAddress, finalStatus, finalArchived, id]
        );

        res.json({
            customer_id: Number(id),
            first_name: finalFirstName,
            last_name: finalLastName,
            full_name: `${finalFirstName} ${finalLastName}`.trim(),
            phone: finalPhone,
            contact: finalPhone,
            street: finalStreet,
            barangay: finalBarangay,
            address: finalAddress,
            status: finalStatus,
            is_archived: finalArchived
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.archiveCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            "UPDATE customers SET is_archived = TRUE, status = 'Inactive' WHERE customer_id = ?",
            [id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Customer not found' });
        res.json({ success: true, message: 'Customer archived/deactivated successfully', customer_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
            return res.status(400).json({ error: 'Cannot delete customer with existing orders. Please archive instead.' });
        }
        res.status(500).json({ error: error.message });
    }
};
