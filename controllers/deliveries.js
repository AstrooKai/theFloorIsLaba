const pool = require('../config/db');

exports.getAllDeliveries = async (req, res) => {
    try {
        const includeArchived = req.query.include_archived === 'true' || req.query.history === 'true';
        const archiveFilter = includeArchived ? '' : 'WHERE (d.is_archived IS NULL OR d.is_archived = FALSE)';

        const [rows] = await pool.query(`
            SELECT 
                d.delivery_id,
                d.order_id,
                d.type,
                d.rider_id,
                DATE_FORMAT(d.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                d.time_slot,
                d.fee,
                d.status,
                d.street,
                d.barangay,
                d.address,
                d.contact,
                d.notes,
                COALESCE(d.is_archived, FALSE) AS is_archived,
                CONCAT(r.first_name, ' ', r.last_name) AS rider,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name
            FROM deliveries d
            JOIN orders o ON d.order_id = o.order_id
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN staff r ON d.rider_id = r.staff_id
            ${archiveFilter}
            ORDER BY d.scheduled_date DESC, d.delivery_id DESC
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
                d.delivery_id,
                d.order_id,
                d.type,
                d.rider_id,
                DATE_FORMAT(d.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                d.time_slot,
                d.fee,
                d.status,
                d.street,
                d.barangay,
                d.address,
                d.contact,
                d.notes,
                COALESCE(d.is_archived, FALSE) AS is_archived,
                CONCAT(r.first_name, ' ', r.last_name) AS rider,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name
            FROM deliveries d
            JOIN orders o ON d.order_id = o.order_id
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN staff r ON d.rider_id = r.staff_id
            WHERE d.delivery_id = ?
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
        const { order_id, type = 'Delivery', scheduled_date, time_slot = '10 AM - 12 PM', fee, rider, rider_id, street, barangay, address, contact, notes } = req.body;
        if (!order_id) {
            return res.status(400).json({ error: 'order_id is required' });
        }

        const [orderRows] = await pool.query(`
            SELECT o.order_id, o.status_id, os.status_name 
            FROM orders o 
            JOIN order_statuses os ON o.status_id = os.status_id 
            WHERE o.order_id = ?
        `, [order_id]);

        if (orderRows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (orderRows[0].status_id === 5 || (orderRows[0].status_name || '').toLowerCase() === 'completed') {
            return res.status(400).json({ error: 'Completed orders cannot be scheduled for pickup or delivery runs' });
        }

        let resolvedRiderId = rider_id || null;
        if (!resolvedRiderId && rider && type === 'Delivery') {
            const [riderRows] = await pool.query(
                "SELECT staff_id FROM staff WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1",
                [rider, rider]
            );
            if (riderRows.length > 0) resolvedRiderId = riderRows[0].staff_id;
        }
        if (type === 'Pickup') {
            resolvedRiderId = null;
        }

        const dateVal = scheduled_date || new Date().toISOString().split('T')[0];
        const finalFee = fee !== undefined ? Number(fee) : (type === 'Delivery' ? 50.00 : 0.00);
        const finalStreet = (street || '').trim();
        const finalBarangay = (barangay || '').trim();
        const finalAddress = address || (finalStreet && finalBarangay ? `${finalStreet}, ${finalBarangay}` : (finalStreet || finalBarangay || 'Cabuyao, Laguna'));
        const finalContact = contact || '09170000000';

        const [result] = await pool.query(`
            INSERT INTO deliveries (order_id, type, rider_id, scheduled_date, time_slot, fee, status, street, barangay, address, contact, notes, is_archived)
            VALUES (?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?, ?, ?, FALSE)
        `, [order_id, type, resolvedRiderId, dateVal, time_slot, finalFee, finalStreet, finalBarangay, finalAddress, finalContact, notes || '']);

        res.status(201).json({
            delivery_id: result.insertId,
            order_id: Number(order_id),
            type,
            rider_id: resolvedRiderId,
            rider: rider || (type === 'Delivery' ? 'Assigned Rider' : null),
            scheduled_date: dateVal,
            time_slot,
            fee: finalFee,
            status: 'Scheduled',
            address: finalAddress,
            street: finalStreet,
            barangay: finalBarangay,
            contact: finalContact,
            notes: notes || '',
            is_archived: false
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, scheduled_date, time_slot, fee, rider, rider_id, status, street, barangay, address, contact, notes, is_archived } = req.body;

        const updates = [];
        const params = [];

        if (type) {
            updates.push('type = ?');
            params.push(type);
        }
        if (scheduled_date) {
            updates.push('scheduled_date = ?');
            params.push(scheduled_date);
        }
        if (time_slot) {
            updates.push('time_slot = ?');
            params.push(time_slot);
        }
        if (fee !== undefined) {
            updates.push('fee = ?');
            params.push(Number(fee));
        }
        if (status) {
            if (status === 'On the way') {
                let targetRiderId = rider_id;
                if (!targetRiderId && rider) {
                    const [riderRows] = await pool.query(
                        "SELECT staff_id FROM staff WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1",
                        [rider, rider]
                    );
                    if (riderRows.length > 0) targetRiderId = riderRows[0].staff_id;
                }
                if (!targetRiderId) {
                    const [current] = await pool.query('SELECT rider_id, type FROM deliveries WHERE delivery_id = ?', [id]);
                    if (current.length > 0) {
                        if (current[0].type === 'Pickup') {
                            return res.status(400).json({ error: 'Pickup runs do not have a transit state.' });
                        }
                        targetRiderId = current[0].rider_id;
                    }
                }
                if (!targetRiderId) {
                    return res.status(400).json({ error: 'Please assign a rider before starting the run.' });
                }
                const [busyRuns] = await pool.query(
                    `SELECT d.delivery_id, CONCAT(s.first_name, ' ', s.last_name) AS rider_name 
                     FROM deliveries d 
                     JOIN staff s ON d.rider_id = s.staff_id 
                     WHERE d.rider_id = ? AND d.status = 'On the way' AND d.delivery_id != ? AND (d.is_archived IS NULL OR d.is_archived = FALSE)`,
                    [targetRiderId, id]
                );
                if (busyRuns.length > 0) {
                    return res.status(400).json({ 
                        error: `Rider ${busyRuns[0].rider_name} is currently occupied on an active delivery (#${busyRuns[0].delivery_id}). Please wait until they complete their current run.` 
                    });
                }
            }
            updates.push('status = ?');
            params.push(status);
        }
        if (rider_id !== undefined) {
            updates.push('rider_id = ?');
            params.push(rider_id);
        } else if (rider) {
            const [riderRows] = await pool.query(
                "SELECT staff_id FROM staff WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1",
                [rider, rider]
            );
            if (riderRows.length > 0) {
                updates.push('rider_id = ?');
                params.push(riderRows[0].staff_id);
            }
        }
        if (type === 'Pickup') {
            updates.push('rider_id = NULL');
        }
        if (street !== undefined) {
            updates.push('street = ?');
            params.push(street);
        }
        if (barangay !== undefined) {
            updates.push('barangay = ?');
            params.push(barangay);
        }
        if (address !== undefined) {
            updates.push('address = ?');
            params.push(address);
        }
        if (contact !== undefined) {
            updates.push('contact = ?');
            params.push(contact);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes);
        }
        if (is_archived !== undefined) {
            updates.push('is_archived = ?');
            params.push(Boolean(is_archived));
        }

        if (updates.length > 0) {
            params.push(id);
            await pool.query(`UPDATE deliveries SET ${updates.join(', ')} WHERE delivery_id = ?`, params);
        }

        res.json({
            delivery_id: Number(id),
            status: status || 'Scheduled'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.archiveDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('UPDATE deliveries SET is_archived = TRUE WHERE delivery_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Delivery not found' });
        res.json({ success: true, message: 'Delivery run archived successfully', delivery_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.unarchiveDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('UPDATE deliveries SET is_archived = FALSE WHERE delivery_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Delivery not found' });
        res.json({ success: true, message: 'Delivery run unarchived successfully', delivery_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('UPDATE deliveries SET is_archived = TRUE WHERE delivery_id = ?', [id]);
        res.json({ message: 'Delivery run archived successfully', delivery_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
