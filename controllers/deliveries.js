const pool = require('../config/db');

exports.getAllDeliveries = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                o.order_id AS delivery_id,
                o.order_id,
                o.release_type AS type,
                c.address,
                c.phone AS contact,
                COALESCE(DATE_FORMAT(o.release_date, '%Y-%m-%d'), DATE_FORMAT(o.order_date, '%Y-%m-%d')) AS scheduled_date,
                '10:00 AM - 12:00 PM' AS time_slot,
                CONCAT(s.first_name, ' ', s.last_name) AS rider,
                s.staff_id,
                CASE WHEN o.release_type = 'Delivery' THEN 50.00 ELSE 0.00 END AS fee,
                CASE 
                    WHEN os.status_name = 'Completed' THEN 'Completed'
                    WHEN os.status_name = 'Out for Delivery' THEN 'On the way'
                    ELSE 'Scheduled'
                END AS status,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                '' AS notes
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN staff s ON o.staff_id = s.staff_id
            JOIN order_statuses os ON o.status_id = os.status_id
            ORDER BY scheduled_date DESC, o.order_id DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDeliveryById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT 
                o.order_id AS delivery_id,
                o.order_id,
                o.release_type AS type,
                c.address,
                c.phone AS contact,
                COALESCE(DATE_FORMAT(o.release_date, '%Y-%m-%d'), DATE_FORMAT(o.order_date, '%Y-%m-%d')) AS scheduled_date,
                '10:00 AM - 12:00 PM' AS time_slot,
                CONCAT(s.first_name, ' ', s.last_name) AS rider,
                s.staff_id,
                CASE WHEN o.release_type = 'Delivery' THEN 50.00 ELSE 0.00 END AS fee,
                CASE 
                    WHEN os.status_name = 'Completed' THEN 'Completed'
                    WHEN os.status_name = 'Out for Delivery' THEN 'On the way'
                    ELSE 'Scheduled'
                END AS status,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                '' AS notes
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN staff s ON o.staff_id = s.staff_id
            JOIN order_statuses os ON o.status_id = os.status_id
            WHERE o.order_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Delivery run not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createDelivery = async (req, res) => {
    try {
        const { order_id, type = 'Delivery', scheduled_date, rider, status = 'Scheduled' } = req.body;
        if (!order_id) {
            return res.status(400).json({ error: 'order_id is required' });
        }

        let riderStaffId = null;
        if (rider) {
            const [riderRows] = await pool.query(
                "SELECT staff_id FROM staff WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1",
                [rider, rider]
            );
            if (riderRows.length > 0) riderStaffId = riderRows[0].staff_id;
        }

        let statusId = 4;
        if (status === 'Completed') statusId = 5;
        else if (status === 'Scheduled') statusId = (type === 'Delivery') ? 4 : 3;

        const dateVal = scheduled_date || new Date().toISOString().split('T')[0];

        await pool.query(
            'UPDATE orders SET release_type = ?, release_date = ?, status_id = ?, staff_id = COALESCE(?, staff_id) WHERE order_id = ?',
            [type, dateVal, statusId, riderStaffId, order_id]
        );

        res.status(201).json({
            delivery_id: Number(order_id),
            order_id: Number(order_id),
            type,
            scheduled_date: dateVal,
            rider: rider || 'Assigned Rider',
            status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, scheduled_date, rider, status } = req.body;

        const updates = [];
        const params = [];

        if (type) {
            updates.push('release_type = ?');
            params.push(type);
        }
        if (scheduled_date) {
            updates.push('release_date = ?');
            params.push(scheduled_date);
        }
        if (status) {
            let statusId = 4;
            if (status === 'Completed') statusId = 5;
            else if (status === 'Scheduled') statusId = (type === 'Delivery') ? 4 : 3;
            else if (status === 'On the way') statusId = 4;
            updates.push('status_id = ?');
            params.push(statusId);
        }
        if (rider) {
            const [riderRows] = await pool.query(
                "SELECT staff_id FROM staff WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1",
                [rider, rider]
            );
            if (riderRows.length > 0) {
                updates.push('staff_id = ?');
                params.push(riderRows[0].staff_id);
            }
        }

        if (updates.length > 0) {
            params.push(id);
            await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`, params);
        }

        res.json({
            delivery_id: Number(id),
            order_id: Number(id),
            status: status || 'Scheduled'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE orders SET release_date = NULL WHERE order_id = ?', [id]);
        res.json({ message: 'Delivery run cleared successfully', delivery_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
