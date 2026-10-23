const pool = require('../config/db');
const { isValidDate, normalizePhone, todayManila } = require('../utils/validation');
const { REQUIRE_PAYMENT_BEFORE_COMPLETE } = require('../utils/business-rules');

exports.getAllDeliveries = async (req, res) => {
    try {
        const includeArchived = req.query.include_archived === 'true' || req.query.history === 'true';
        const isRider = String(req.staff?.role || '').toLowerCase() === 'rider';
        const filters = [];
        const params = [];
        if (isRider) {
            filters.push('d.rider_id = ?', '(d.is_archived IS NULL OR d.is_archived = FALSE)');
            params.push(req.staff.staff_id);
        } else if (!includeArchived) {
            filters.push('(d.is_archived IS NULL OR d.is_archived = FALSE)');
        }
        const archiveFilter = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const feeColumn = isRider ? 'NULL AS fee' : 'd.fee';

        const [rows] = await pool.query(`
            SELECT 
                d.delivery_id,
                d.order_id,
                d.type,
                d.rider_id,
                DATE_FORMAT(d.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                d.time_slot,
                ${feeColumn},
                d.status,
                d.street,
                d.street AS street_address,
                d.barangay,
                CONCAT_WS(', ', d.street, d.barangay) AS address,
                d.contact,
                d.notes,
                COALESCE(d.is_archived, FALSE) AS is_archived,
                CONCAT(r.first_name, ' ', r.last_name) AS rider,
                CONCAT(r.first_name, ' ', r.last_name) AS rider_name,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name
            FROM deliveries d
            JOIN orders o ON d.order_id = o.order_id
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN staff r ON d.rider_id = r.staff_id
            ${archiveFilter}
            ORDER BY d.scheduled_date DESC, d.delivery_id DESC
        `, params);
        res.json(rows);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getDeliveryById = async (req, res) => {
    try {
        const { id } = req.params;
        const isRider = String(req.staff?.role || '').toLowerCase() === 'rider';
        const riderFilter = isRider ? 'AND d.rider_id = ? AND (d.is_archived IS NULL OR d.is_archived = FALSE)' : '';
        const feeColumn = isRider ? 'NULL AS fee' : 'd.fee';
        const [rows] = await pool.query(`
            SELECT 
                d.delivery_id,
                d.order_id,
                d.type,
                d.rider_id,
                DATE_FORMAT(d.scheduled_date, '%Y-%m-%d') AS scheduled_date,
                d.time_slot,
                ${feeColumn},
                d.status,
                d.street,
                d.street AS street_address,
                d.barangay,
                CONCAT_WS(', ', d.street, d.barangay) AS address,
                d.contact,
                d.notes,
                COALESCE(d.is_archived, FALSE) AS is_archived,
                CONCAT(r.first_name, ' ', r.last_name) AS rider,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name
            FROM deliveries d
            JOIN orders o ON d.order_id = o.order_id
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN staff r ON d.rider_id = r.staff_id
            WHERE d.delivery_id = ? ${riderFilter}
        `, isRider ? [id, req.staff.staff_id] : [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Delivery run not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createDelivery = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { order_id, type = 'Delivery', scheduled_date, time_slot = '10 AM - 12 PM', fee, rider, rider_id, street, street_address, barangay, address, contact, notes } = req.body;
        if (!order_id) {
            await conn.rollback();
            return res.status(400).json({ error: 'order_id is required' });
        }
        if (!['Pickup', 'Delivery'].includes(type)) {
            await conn.rollback();
            return res.status(400).json({ error: 'Run type must be Pickup or Delivery' });
        }

        const [orderRows] = await conn.query(`
            SELECT o.order_id, o.status_id, o.is_archived, os.status_name, o.release_type,
                   c.street_address, c.barangay, c.phone,
                   COALESCE((SELECT SUM(oi.subtotal) FROM order_items oi WHERE oi.order_id = o.order_id), 0) AS item_total,
                   COALESCE((SELECT SUM(d.fee) FROM deliveries d
                       WHERE d.order_id = o.order_id AND d.type = 'Delivery' AND d.status <> 'Cancelled'
                         AND (d.is_archived IS NULL OR d.is_archived = FALSE)), 0) AS delivery_fees,
                   COALESCE((SELECT SUM(p.amount_paid) FROM payments p
                       WHERE p.order_id = o.order_id AND (p.status IS NULL OR p.status = 'Paid')
                         AND (p.is_archived IS NULL OR p.is_archived = FALSE)), 0) AS total_paid,
                   (SELECT COUNT(*) FROM deliveries d
                       WHERE d.order_id = o.order_id AND d.status IN ('Scheduled', 'On the way')
                         AND (d.is_archived IS NULL OR d.is_archived = FALSE)) AS active_runs_count
            FROM orders o 
            JOIN customers c ON c.customer_id = o.customer_id
            JOIN order_statuses os ON o.status_id = os.status_id 
            WHERE o.order_id = ?
            FOR UPDATE
        `, [order_id]);

        if (orderRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = orderRows[0];
        if (order.is_archived) {
            await conn.rollback();
            return res.status(400).json({ error: 'Delivery runs cannot be added to an archived order.' });
        }

        if (type !== order.release_type) {
            await conn.rollback();
            return res.status(400).json({ error: 'Run type must match the order release type' });
        }
        if (Number(order.active_runs_count) > 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'This order already has an active run' });
        }
        if ((order.status_name || '').toLowerCase() === 'completed') {
            await conn.rollback();
            return res.status(400).json({ error: 'Orders that have already been picked up or delivered cannot be scheduled for a run' });
        }

        const dateVal = scheduled_date || todayManila();
        if (!isValidDate(dateVal)) {
            await conn.rollback();
            return res.status(400).json({ error: 'Scheduled date must be a valid YYYY-MM-DD date' });
        }
        const finalFee = fee !== undefined ? Number(fee) : (type === 'Delivery' ? 50.00 : 0.00);
        if (!Number.isFinite(finalFee) || finalFee < 0 || finalFee > 99999999.99) {
            await conn.rollback();
            return res.status(400).json({ error: 'Delivery fee must be a non-negative amount' });
        }
        const orderBalance = Math.round((Number(order.item_total) + Number(order.delivery_fees) - Number(order.total_paid)) * 100) / 100;
        if (finalFee !== 0 && orderBalance <= 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Cannot add a delivery fee to an order that is already fully paid' });
        }

        let resolvedRiderId = rider_id || null;
        if (!resolvedRiderId && rider && type === 'Delivery') {
            const [riderRows] = await conn.query(
                "SELECT staff_id FROM staff WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1",
                [rider, rider]
            );
            if (riderRows.length > 0) resolvedRiderId = riderRows[0].staff_id;
        }
        if (type === 'Pickup') {
            resolvedRiderId = null;
        }

        const addressParts = String(address || '').split(',');
        const finalStreet = String(street || street_address || addressParts[0] || order.street_address || '').trim();
        const finalBarangay = String(barangay || addressParts[1] || order.barangay || '').trim();
        const finalContact = contact !== undefined ? normalizePhone(contact) : normalizePhone(order.phone);
        if (!finalContact) {
            await conn.rollback();
            return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number starting with 09' });
        }
        if (!finalStreet || !finalBarangay) {
            await conn.rollback();
            return res.status(400).json({ error: 'A street address and barangay are required for the run' });
        }

        const displayAddress = `${finalStreet}, ${finalBarangay}`;
        const [result] = await conn.query(`
            INSERT INTO deliveries (order_id, type, rider_id, scheduled_date, time_slot, fee, status, street, barangay, contact, notes, is_archived)
            VALUES (?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?, ?, FALSE)
        `, [order_id, type, resolvedRiderId, dateVal, time_slot, finalFee, finalStreet, finalBarangay, finalContact, notes || '']);
        await conn.commit();

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
            street: finalStreet,
            street_address: finalStreet,
            barangay: finalBarangay,
            address: displayAddress,
            contact: finalContact,
            notes: notes || '',
            is_archived: false
        });
    } catch (error) {
        await conn.rollback();
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
};

exports.updateDelivery = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const { type, scheduled_date, time_slot, fee, rider, rider_id, status, street, street_address, barangay, contact, notes } = req.body;
        const [currentRows] = await conn.query(`
            SELECT d.*, o.release_type, o.is_archived AS order_is_archived, os.status_name AS order_status,
                   COALESCE((SELECT SUM(oi.subtotal) FROM order_items oi WHERE oi.order_id = o.order_id), 0) AS item_total,
                   COALESCE((SELECT SUM(fd.fee) FROM deliveries fd
                       WHERE fd.order_id = o.order_id AND fd.type = 'Delivery' AND fd.status <> 'Cancelled'
                         AND (fd.is_archived IS NULL OR fd.is_archived = FALSE)), 0) AS delivery_fees,
                   COALESCE((SELECT SUM(p.amount_paid) FROM payments p
                       WHERE p.order_id = o.order_id AND (p.status IS NULL OR p.status = 'Paid')
                         AND (p.is_archived IS NULL OR p.is_archived = FALSE)), 0) AS total_paid
            FROM deliveries d
            JOIN orders o ON o.order_id = d.order_id
            JOIN order_statuses os ON os.status_id = o.status_id
            WHERE d.delivery_id = ?
            FOR UPDATE
        `, [id]);
        if (currentRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Delivery run not found' });
        }
        const current = currentRows[0];
        if (String(req.staff?.role || '').toLowerCase() === 'rider') {
            const keys = Object.keys(req.body || {});
            if (Number(current.rider_id) !== Number(req.staff.staff_id) ||
                current.type !== 'Delivery' ||
                keys.length !== 1 ||
                keys[0] !== 'status' ||
                !['On the way', 'Completed'].includes(status)) {
                await conn.rollback();
                return res.status(403).json({ error: 'Riders may only update the status of their assigned delivery runs.' });
            }
        }
        if (current.order_is_archived) {
            await conn.rollback();
            return res.status(400).json({ error: 'Delivery runs on archived orders cannot be changed.' });
        }
        if (current.is_archived) {
            await conn.rollback();
            return res.status(400).json({ error: 'Archived delivery runs must be restored before they can be changed.' });
        }
        const finalType = type || current.type;
        if (!['Pickup', 'Delivery'].includes(finalType) || finalType !== current.release_type) {
            await conn.rollback();
            return res.status(400).json({ error: 'Run type must match the order release type' });
        }
        if (scheduled_date !== undefined && !isValidDate(scheduled_date)) {
            await conn.rollback();
            return res.status(400).json({ error: 'Scheduled date must be a valid YYYY-MM-DD date' });
        }
        const allowedStatuses = ['Scheduled', 'On the way', 'Completed', 'Cancelled'];
        const transitions = {
            Scheduled: ['On the way', 'Cancelled'],
            'On the way': ['Completed', 'Cancelled'],
            Completed: [],
            Cancelled: []
        };
        if (status !== undefined && !allowedStatuses.includes(status)) {
            await conn.rollback();
            return res.status(400).json({ error: 'Invalid delivery run status' });
        }
        if (status && status !== current.status && !transitions[current.status]?.includes(status)) {
            await conn.rollback();
            return res.status(400).json({ error: `Delivery run cannot transition from ${current.status} to ${status}` });
        }
        if (status === 'On the way' && finalType === 'Delivery' &&
            !['Folding', 'Out for Delivery'].includes(current.order_status)) {
            await conn.rollback();
            return res.status(400).json({ error: 'Delivery runs can start only after the order reaches the ready stage' });
        }
        if (status === 'On the way' && current.status !== 'On the way' && finalType === 'Delivery' &&
            REQUIRE_PAYMENT_BEFORE_COMPLETE &&
            Number(current.total_paid) + 0.001 < Number(current.item_total) + Number(current.delivery_fees)) {
            await conn.rollback();
            return res.status(400).json({ error: 'The order must be fully paid before its delivery run can start.' });
        }
        if (status === 'Completed' && finalType === 'Pickup' &&
            current.order_status !== 'Ready for Pickup') {
            await conn.rollback();
            return res.status(400).json({ error: 'Pickup runs can complete only after the order is ready for pickup' });
        }
        if (status === 'Completed' && current.status !== 'Completed' && REQUIRE_PAYMENT_BEFORE_COMPLETE &&
            Number(current.total_paid) + 0.001 < Number(current.item_total) + Number(current.delivery_fees)) {
            await conn.rollback();
            return res.status(400).json({ error: 'The order must be fully paid before the run can be completed.' });
        }

        const updates = [];
        const params = [];

        if (type) {
            updates.push('type = ?');
            params.push(finalType);
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
            const newFee = Number(fee);
            if (!Number.isFinite(newFee) || newFee < 0 || newFee > 99999999.99) {
                await conn.rollback();
                return res.status(400).json({ error: 'Delivery fee must be a non-negative amount' });
            }
            if (newFee !== Number(current.fee)) {
                if (current.type === 'Delivery' && current.status !== 'Cancelled' &&
                    Number(current.item_total) + Number(current.delivery_fees) - Number(current.total_paid) <= 0) {
                    await conn.rollback();
                    return res.status(400).json({ error: 'Cannot change a delivery fee on an order that is already fully paid' });
                }
                const currentFeeIsBillable = current.type === 'Delivery' && current.status !== 'Cancelled';
                const proposedTotal = Number(current.item_total) + Number(current.delivery_fees) -
                    (currentFeeIsBillable ? Number(current.fee) : 0) +
                    (currentFeeIsBillable ? newFee : 0);
                if (proposedTotal + 0.001 < Number(current.total_paid)) {
                    await conn.rollback();
                    return res.status(400).json({ error: 'Changing this delivery fee would make the order overpaid.' });
                }
            }
            updates.push('fee = ?');
            params.push(newFee);
        }
        if (status === 'Cancelled' && current.status !== 'Cancelled' &&
            current.type === 'Delivery' &&
            Number(current.item_total) + Number(current.delivery_fees) - Number(current.fee) + 0.001 < Number(current.total_paid)) {
            await conn.rollback();
            return res.status(400).json({ error: 'This run cannot be cancelled because its fee has already been paid.' });
        }
        if (status) {
            if (status === 'On the way' && finalType === 'Delivery') {
                let targetRiderId = rider_id;
                if (!targetRiderId && rider) {
                    const [riderRows] = await conn.query(
                        "SELECT staff_id FROM staff WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1",
                        [rider, rider]
                    );
                    if (riderRows.length > 0) targetRiderId = riderRows[0].staff_id;
                }
                if (!targetRiderId) {
                    targetRiderId = current.rider_id;
                }
                if (!targetRiderId) {
                    await conn.rollback();
                    return res.status(400).json({ error: 'Please assign a rider before starting the run.' });
                }
                const [busyRuns] = await conn.query(
                    `SELECT d.delivery_id, CONCAT(s.first_name, ' ', s.last_name) AS rider_name 
                     FROM deliveries d 
                     JOIN staff s ON d.rider_id = s.staff_id 
                     WHERE d.rider_id = ? AND d.status = 'On the way' AND d.delivery_id != ? AND (d.is_archived IS NULL OR d.is_archived = FALSE)`,
                    [targetRiderId, id]
                );
                if (busyRuns.length > 0) {
                    await conn.rollback();
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
            const [riderRows] = await conn.query(
                "SELECT staff_id FROM staff WHERE CONCAT(first_name, ' ', last_name) = ? OR first_name = ? LIMIT 1",
                [rider, rider]
            );
            if (riderRows.length > 0) {
                updates.push('rider_id = ?');
                params.push(riderRows[0].staff_id);
            }
        }
        if (finalType === 'Pickup') {
            updates.push('rider_id = NULL');
        }
        const targetStreet = street !== undefined ? street : street_address;
        if (targetStreet !== undefined) {
            updates.push('street = ?');
            params.push(targetStreet);
        }
        if (barangay !== undefined) {
            updates.push('barangay = ?');
            params.push(barangay);
        }
        if (contact !== undefined) {
            const phoneDigits = normalizePhone(contact);
            if (!phoneDigits) {
                await conn.rollback();
                return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number starting with 09' });
            }
            updates.push('contact = ?');
            params.push(phoneDigits);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes);
        }
        if (updates.length > 0) {
            params.push(id);
            await conn.query(`UPDATE deliveries SET ${updates.join(', ')} WHERE delivery_id = ?`, params);
        }

        if (status === 'Completed' || (status === 'On the way' && finalType === 'Delivery')) {
            const orderStatusName = status === 'Completed' ? 'Completed' : 'Out for Delivery';
            const [statusRows] = await conn.query(
                'SELECT status_id FROM order_statuses WHERE status_name = ? LIMIT 1',
                [orderStatusName]
            );
            if (statusRows.length === 0) {
                throw new Error(`Missing order status: ${orderStatusName}`);
            }
            if (status === 'Completed') {
                await conn.query(
                    'UPDATE orders SET status_id = ?, release_date = ? WHERE order_id = ?',
                    [statusRows[0].status_id, todayManila(), current.order_id]
                );
            } else {
                await conn.query(
                    'UPDATE orders SET status_id = ? WHERE order_id = ?',
                    [statusRows[0].status_id, current.order_id]
                );
            }
        }
        await conn.commit();

        res.json({
            delivery_id: Number(id),
            status: status || current.status
        });
    } catch (error) {
        await conn.rollback();
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
};

exports.archiveDelivery = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const [rows] = await conn.query(
            'SELECT order_id, type, status, fee, is_archived FROM deliveries WHERE delivery_id = ? FOR UPDATE',
            [id]
        );
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Delivery not found' });
        }
        const [orderRows] = await conn.query(
            'SELECT is_archived FROM orders WHERE order_id = ? FOR UPDATE',
            [rows[0].order_id]
        );
        if (orderRows[0]?.is_archived) {
            await conn.rollback();
            return res.status(400).json({ error: 'Delivery runs on archived orders cannot be archived.' });
        }
        if (rows[0].is_archived) {
            await conn.commit();
            return res.json({ success: true, message: 'Delivery run is already archived', delivery_id: Number(id) });
        }
        if (rows[0].type === 'Delivery' && rows[0].status !== 'Cancelled') {
            const [totals] = await conn.query(`
                SELECT
                    COALESCE((SELECT SUM(subtotal) FROM order_items WHERE order_id = ?), 0) +
                    COALESCE((SELECT SUM(fee) FROM deliveries WHERE order_id = ? AND type = 'Delivery'
                        AND status <> 'Cancelled' AND (is_archived IS NULL OR is_archived = FALSE)), 0) AS total,
                    COALESCE((SELECT SUM(amount_paid) FROM payments WHERE order_id = ? AND (status IS NULL OR status = 'Paid')
                        AND (is_archived IS NULL OR is_archived = FALSE)), 0) AS total_paid
            `, [rows[0].order_id, rows[0].order_id, rows[0].order_id]);
            if (Number(totals[0].total) - Number(rows[0].fee) + 0.001 < Number(totals[0].total_paid)) {
                await conn.rollback();
                return res.status(400).json({ error: 'This run cannot be archived because its fee has already been paid.' });
            }
        }
        await conn.query('UPDATE deliveries SET is_archived = TRUE WHERE delivery_id = ?', [id]);
        await conn.commit();
        res.json({ success: true, message: 'Delivery run archived successfully', delivery_id: Number(id) });
    } catch (error) {
        await conn.rollback();
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
};

exports.unarchiveDelivery = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const [rows] = await conn.query(
            'SELECT order_id, type, status, fee, is_archived FROM deliveries WHERE delivery_id = ?',
            [id]
        );
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Delivery not found' });
        }
        const [orderRows] = await conn.query(
            'SELECT is_archived FROM orders WHERE order_id = ? FOR UPDATE',
            [rows[0].order_id]
        );
        if (orderRows[0]?.is_archived) {
            await conn.rollback();
            return res.status(400).json({ error: 'Delivery runs on archived orders cannot be restored.' });
        }
        if (!rows[0].is_archived) {
            await conn.commit();
            return res.json({ success: true, message: 'Delivery run is already active', delivery_id: Number(id) });
        }
        if (['Scheduled', 'On the way'].includes(rows[0].status)) {
            const [activeRuns] = await conn.query(
                "SELECT delivery_id FROM deliveries WHERE order_id = ? AND delivery_id <> ? AND status IN ('Scheduled', 'On the way') AND (is_archived IS NULL OR is_archived = FALSE) LIMIT 1",
                [rows[0].order_id, id]
            );
            if (activeRuns.length > 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Another active run already exists for this order.' });
            }
        }
        if (rows[0].type === 'Delivery' && rows[0].status !== 'Cancelled') {
            const [totals] = await conn.query(`
                SELECT
                    COALESCE((SELECT SUM(subtotal) FROM order_items WHERE order_id = ?), 0) +
                    COALESCE((SELECT SUM(fee) FROM deliveries WHERE order_id = ? AND type = 'Delivery'
                        AND status <> 'Cancelled' AND (is_archived IS NULL OR is_archived = FALSE)), 0) AS current_total,
                    COALESCE((SELECT SUM(amount_paid) FROM payments WHERE order_id = ? AND (status IS NULL OR status = 'Paid')
                        AND (is_archived IS NULL OR is_archived = FALSE)), 0) AS total_paid
            `, [rows[0].order_id, rows[0].order_id, rows[0].order_id]);
            if (Number(totals[0].total_paid) > Number(totals[0].current_total) + Number(rows[0].fee) + 0.001) {
                await conn.rollback();
                return res.status(400).json({ error: 'Restoring this delivery fee would make the order overpaid.' });
            }
        }
        await conn.query('UPDATE deliveries SET is_archived = FALSE WHERE delivery_id = ?', [id]);
        await conn.commit();
        res.json({ success: true, message: 'Delivery run unarchived successfully', delivery_id: Number(id) });
    } catch (error) {
        await conn.rollback();
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
};
