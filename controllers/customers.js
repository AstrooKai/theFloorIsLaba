const pool = require('../config/db');
const { cleanName, isValidPersonName, normalizePhone } = require('../utils/validation');

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
        first_name = cleanName(first_name);
        last_name = cleanName(last_name || '');
        const finalPhone = normalizePhone(phone || contact || '');
        const rawStreet = street_address !== undefined ? street_address : (street !== undefined ? street : (address || ''));
        const finalStreetAddress = (rawStreet || '').trim();
        const finalBarangay = (barangay || '').trim();
        const finalStatus = status || 'Active';

        if (!isValidPersonName(first_name) || !isValidPersonName(last_name)) {
            return res.status(400).json({ error: 'Enter valid first and last names (maximum 50 characters).' });
        }
        if (!finalPhone) {
            return res.status(400).json({ error: 'Enter a valid 11-digit mobile number starting with 09.' });
        }
        if (!finalStreetAddress || finalStreetAddress.length > 150 || !finalBarangay || finalBarangay.length > 50) {
            return res.status(400).json({ error: 'A valid street address and barangay are required.' });
        }
        if (!['Active', 'Inactive'].includes(finalStatus)) {
            return res.status(400).json({ error: 'Customer status must be Active or Inactive.' });
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
        if (is_archived !== undefined && String(req.staff?.role || '').toLowerCase() !== 'manager') {
            return res.status(403).json({ error: 'Only a Manager may archive customers.' });
        }
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
        const finalFirstName = cleanName(first_name !== undefined ? first_name : current.first_name);
        const finalLastName = cleanName(last_name !== undefined ? last_name : current.last_name);
        const rawPhone = (phone !== undefined ? phone : (contact !== undefined ? contact : current.phone)) || '';
        const finalPhone = normalizePhone(rawPhone);
        
        const inputStreet = street_address !== undefined ? street_address : (street !== undefined ? street : address);
        const finalStreetAddress = inputStreet !== undefined ? inputStreet.trim() : (current.street_address || '');
        const finalBarangay = barangay !== undefined ? barangay : (current.barangay || '');
        const finalStatus = status !== undefined ? status : (current.status || 'Active');
        const finalArchived = is_archived !== undefined ? Boolean(is_archived) : Boolean(current.is_archived);

        if (!isValidPersonName(finalFirstName) || !isValidPersonName(finalLastName) || !finalPhone) {
            return res.status(400).json({ error: 'Enter valid first and last names and a valid 11-digit mobile number starting with 09.' });
        }
        if (finalStreetAddress.length > 150 || finalBarangay.length > 50) {
            return res.status(400).json({ error: 'Address fields exceed their maximum length.' });
        }
        if (!['Active', 'Inactive'].includes(finalStatus)) {
            return res.status(400).json({ error: 'Customer status must be Active or Inactive.' });
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
