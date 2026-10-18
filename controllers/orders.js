const pool = require('../config/db');

exports.getAllOrders = async (req, res) => {
    try {
        const includeArchived = req.query.include_archived === 'true' || req.query.history === 'true';
        const archiveFilter = includeArchived ? '' : 'WHERE (o.is_archived IS NULL OR o.is_archived = FALSE)';

        const [rows] = await pool.query(`
            SELECT 
                o.order_id,
                o.order_date,
                o.release_type,
                o.release_date,
                COALESCE(o.is_archived, FALSE) AS is_archived,
                o.customer_id,
                c.first_name,
                c.last_name,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.phone AS customer_phone,
                c.phone AS contact,
                c.street_address,
                c.street_address AS street,
                c.barangay,
                c.street_address AS address,
                o.staff_id,
                CONCAT(s.first_name, ' ', s.last_name) AS staff_name,
                os.status_id,
                os.status_name AS order_status,
                MAX(oi.service_id) AS service_id,
                COALESCE(SUM(oi.weight_kg), 1.00) AS weight_kg,
                COALESCE(SUM(oi.subtotal), 0) AS total_amount,
                COALESCE(SUM(oi.subtotal), 0) AS total,
                COALESCE(pay.total_paid, 0) AS total_paid,
                CASE 
                    WHEN COALESCE(pay.total_paid, 0) >= COALESCE(SUM(oi.subtotal), 0) AND COALESCE(SUM(oi.subtotal), 0) > 0 THEN 'Paid'
                    WHEN (
                        SELECT COUNT(*) 
                        FROM payments 
                        WHERE order_id = o.order_id 
                          AND (is_archived IS NULL OR is_archived = FALSE) 
                          AND status = 'Refunded'
                    ) > 0 AND COALESCE(pay.total_paid, 0) <= 0 THEN 'Refunded'
                    ELSE 'Unpaid'
                END AS payment_status
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN staff s ON o.staff_id = s.staff_id
            JOIN order_statuses os ON o.status_id = os.status_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN (
                SELECT order_id, SUM(amount_paid) AS total_paid 
                FROM payments 
                WHERE (is_archived IS NULL OR is_archived = FALSE)
                  AND (status IS NULL OR status = 'Paid')
                GROUP BY order_id
            ) pay ON o.order_id = pay.order_id
            ${archiveFilter}
            GROUP BY o.order_id, o.order_date, o.release_type, o.release_date, o.is_archived, o.customer_id, c.first_name, c.last_name, c.phone, c.street_address, c.barangay, o.staff_id, s.first_name, s.last_name, os.status_id, os.status_name, pay.total_paid
            ORDER BY o.order_id DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const [orders] = await pool.query(`
            SELECT 
                o.order_id,
                o.order_date,
                o.release_type,
                o.release_date,
                o.customer_id,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.phone AS contact,
                c.street_address,
                c.street_address AS street,
                c.barangay,
                c.street_address AS address,
                o.staff_id,
                CONCAT(s.first_name, ' ', s.last_name) AS staff_name,
                os.status_id,
                os.status_name AS order_status,
                COALESCE(SUM(oi.subtotal), 0) AS total,
                COALESCE(SUM(oi.subtotal), 0) AS total_amount,
                COALESCE(pay.total_paid, 0) AS total_paid,
                CASE 
                    WHEN COALESCE(pay.total_paid, 0) >= COALESCE(SUM(oi.subtotal), 0) AND COALESCE(SUM(oi.subtotal), 0) > 0 THEN 'Paid'
                    WHEN (
                        SELECT COUNT(*) 
                        FROM payments 
                        WHERE order_id = o.order_id 
                          AND (is_archived IS NULL OR is_archived = FALSE) 
                          AND status = 'Refunded'
                    ) > 0 AND COALESCE(pay.total_paid, 0) <= 0 THEN 'Refunded'
                    ELSE 'Unpaid'
                END AS payment_status
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN staff s ON o.staff_id = s.staff_id
            JOIN order_statuses os ON o.status_id = os.status_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN (
                SELECT order_id, SUM(amount_paid) AS total_paid 
                FROM payments 
                WHERE (is_archived IS NULL OR is_archived = FALSE)
                  AND (status IS NULL OR status = 'Paid')
                GROUP BY order_id
            ) pay ON o.order_id = pay.order_id
            WHERE o.order_id = ?
            GROUP BY o.order_id, o.order_date, o.release_type, o.release_date, o.customer_id, c.first_name, c.last_name, c.phone, c.street_address, c.barangay, o.staff_id, s.first_name, s.last_name, os.status_id, os.status_name, pay.total_paid
        `, [id]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];

        const [items] = await pool.query(`
            SELECT 
                oi.order_item_id,
                oi.service_id,
                st.service_name,
                oi.weight_kg,
                oi.subtotal
            FROM order_items oi
            JOIN service_types st ON oi.service_id = st.service_id
            WHERE oi.order_id = ?
        `, [id]);

        const [payments] = await pool.query(`
            SELECT 
                payment_id, 
                amount_paid, 
                amount_paid AS amount,
                payment_method, 
                payment_method AS method,
                DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date,
                DATE_FORMAT(payment_date, '%Y-%m-%d') AS paid_at,
                COALESCE(status, 'Paid') AS status,
                COALESCE(reference_no, '') AS reference_no,
                COALESCE(is_archived, FALSE) AS is_archived
            FROM payments
            WHERE order_id = ?
            ORDER BY payment_date DESC, payment_id DESC
        `, [id]);

        order.items = items;
        order.payments = payments;

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOrderStatuses = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT status_id, status_name FROM order_statuses ORDER BY status_id ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createOrder = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const {
            customer_id,
            customer_name,
            contact,
            address,
            staff_id,
            status_id,
            order_status,
            release_type = 'Pickup',
            release_date = null,
            order_date,
            total = 0,
            items = []
        } = req.body;

        // Resolve customer
        let finalCustomerId = customer_id;
        let firstName = (req.body.first_name || '').trim();
        let lastName = (req.body.last_name || '').trim();
        const contactNo = (contact || req.body.phone || '').trim();
        const streetAddr = (req.body.street_address || req.body.street || '').trim();
        const barangayVal = (req.body.barangay || '').trim();

        if (!finalCustomerId) {
            if (!firstName && customer_name) {
                const parts = customer_name.trim().split(/\s+/);
                firstName = parts[0] || 'Customer';
                lastName = parts.slice(1).join(' ') || 'Customer';
            }

            const [found] = await conn.query(
                'SELECT customer_id FROM customers WHERE (first_name = ? AND last_name = ?) OR (phone = ? AND phone != "") LIMIT 1',
                [firstName, lastName, contactNo]
            );

            if (found.length > 0) {
                finalCustomerId = found[0].customer_id;
                if (streetAddr || barangayVal) {
                    await conn.query(
                        'UPDATE customers SET street_address = COALESCE(NULLIF(street_address, ""), ?), barangay = COALESCE(NULLIF(barangay, ""), ?) WHERE customer_id = ?',
                        [streetAddr, barangayVal, finalCustomerId]
                    );
                }
            } else {
                const [createdCust] = await conn.query(
                    'INSERT INTO customers (first_name, last_name, phone, street_address, barangay, status, is_archived) VALUES (?, ?, ?, ?, ?, "Active", FALSE)',
                    [firstName || 'Customer', lastName || '', contactNo || '09170000000', streetAddr, barangayVal]
                );
                finalCustomerId = createdCust.insertId;
            }
        }

        // Resolve staff
        let finalStaffId = staff_id;
        if (!finalStaffId) {
            const [staffRows] = await conn.query('SELECT staff_id FROM staff LIMIT 1');
            finalStaffId = staffRows.length > 0 ? staffRows[0].staff_id : 1;
        }

        // New orders always strictly start at 'Received' (status_id 1)
        const finalStatusId = 1;

        const finalOrderDate = order_date || new Date().toISOString().split('T')[0];

        // Insert into orders
        const [orderResult] = await conn.query(
            'INSERT INTO orders (customer_id, staff_id, status_id, order_date, release_type, release_date) VALUES (?, ?, ?, ?, ?, ?)',
            [finalCustomerId, finalStaffId, finalStatusId, finalOrderDate, release_type, release_date]
        );

        const newOrderId = orderResult.insertId;

        // Insert order items
        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                await conn.query(
                    'INSERT INTO order_items (order_id, service_id, weight_kg, subtotal) VALUES (?, ?, ?, ?)',
                    [newOrderId, item.service_id, item.weight_kg, item.subtotal]
                );
            }
        } else {
            // Default 1 item so junction table order_items always maintains relational integrity
            const [defaultService] = await conn.query('SELECT service_id, price_per_kg FROM service_types LIMIT 1');
            const svcId = defaultService.length > 0 ? defaultService[0].service_id : 1;
            const rate = defaultService.length > 0 ? Number(defaultService[0].price_per_kg) : 45.00;
            const subtotalVal = Number(total) || rate;
            const weightVal = Number((subtotalVal / rate).toFixed(2)) || 1.0;

            await conn.query(
                'INSERT INTO order_items (order_id, service_id, weight_kg, subtotal) VALUES (?, ?, ?, ?)',
                [newOrderId, svcId, weightVal, subtotalVal]
            );
        }

        await conn.commit();

        res.status(201).json({
            order_id: newOrderId,
            customer_id: finalCustomerId,
            customer_name: customer_name || 'Customer',
            contact: contact || '',
            address: address || '',
            order_date: finalOrderDate,
            order_status: order_status || (finalStatusId === 5 ? 'Completed' : 'Received'),
            total: Number(total) || 0
        });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        conn.release();
    }
};

exports.updateOrder = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { id } = req.params;
        const { order_status, status_id, release_type, release_date, customer_name, contact, address, total } = req.body;

        const [existing] = await conn.query('SELECT * FROM orders WHERE order_id = ?', [id]);
        if (existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        let newStatusId = status_id;
        if (!newStatusId && order_status) {
            const statusMap = {
                'Received': 1,
                'Washing': 2,
                'Ready for Pickup': 3,
                'Out for Delivery': 4,
                'Completed': 5
            };
            if (statusMap[order_status]) {
                newStatusId = statusMap[order_status];
            }
        }

        const updates = [];
        const params = [];

        if (newStatusId) {
            updates.push('status_id = ?');
            params.push(newStatusId);
        }
        if (release_type) {
            updates.push('release_type = ?');
            params.push(release_type);
        }
        if (release_date !== undefined) {
            updates.push('release_date = ?');
            params.push(release_date);
        }
        if (typeof req.body.is_archived !== 'undefined') {
            updates.push('is_archived = ?');
            params.push(Boolean(req.body.is_archived));
        }

        if (updates.length > 0) {
            params.push(id);
            await conn.query(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`, params);
        }

        // Update customer details if provided
        if (customer_name || contact || address) {
            const customerId = existing[0].customer_id;
            const custUpdates = [];
            const custParams = [];

            if (customer_name) {
                const parts = customer_name.trim().split(/\s+/);
                custUpdates.push('first_name = ?', 'last_name = ?');
                custParams.push(parts[0] || '', parts.slice(1).join(' ') || '');
            }
            if (contact) {
                custUpdates.push('phone = ?');
                custParams.push(contact);
            }
            if (address) {
                custUpdates.push('address = ?');
                custParams.push(address);
            }

            if (custUpdates.length > 0) {
                custParams.push(customerId);
                await conn.query(`UPDATE customers SET ${custUpdates.join(', ')} WHERE customer_id = ?`, custParams);
            }
        }

        // Update order items if specified
        if (Array.isArray(req.body.items) && req.body.items.length > 0) {
            await conn.query('DELETE FROM order_items WHERE order_id = ?', [id]);
            for (const item of req.body.items) {
                await conn.query(
                    'INSERT INTO order_items (order_id, service_id, weight_kg, subtotal) VALUES (?, ?, ?, ?)',
                    [id, item.service_id, item.weight_kg, item.subtotal]
                );
            }
        } else if (total !== undefined) {
            await conn.query(
                'UPDATE order_items SET subtotal = ? WHERE order_id = ? LIMIT 1',
                [Number(total), id]
            );
        }

        await conn.commit();

        const statusNames = { 1: 'Received', 2: 'Washing', 3: 'Ready for Pickup', 4: 'Out for Delivery', 5: 'Completed' };
        const resolvedName = order_status || statusNames[newStatusId] || 'Received';
        res.json({
            order_id: Number(id),
            order_status: resolvedName,
            total: Number(total) || 0
        });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        conn.release();
    }
};

exports.archiveOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('UPDATE orders SET is_archived = TRUE WHERE order_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, message: 'Order archived successfully', order_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.unarchiveOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('UPDATE orders SET is_archived = FALSE WHERE order_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, message: 'Order unarchived successfully', order_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.togglePaymentStatus = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { id } = req.params;

        const [orders] = await conn.query(`
            SELECT 
                o.order_id,
                COALESCE(SUM(oi.subtotal), 0) AS total_amount,
                COALESCE(pay.total_paid, 0) AS total_paid,
                CASE 
                    WHEN COALESCE(pay.total_paid, 0) >= COALESCE(SUM(oi.subtotal), 0) AND COALESCE(SUM(oi.subtotal), 0) > 0 THEN 'Paid'
                    WHEN (
                        SELECT COUNT(*) 
                        FROM payments 
                        WHERE order_id = o.order_id 
                          AND (is_archived IS NULL OR is_archived = FALSE) 
                          AND status = 'Refunded'
                    ) > 0 AND COALESCE(pay.total_paid, 0) <= 0 THEN 'Refunded'
                    ELSE 'Unpaid'
                END AS current_payment_status
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN (
                SELECT order_id, SUM(amount_paid) AS total_paid 
                FROM payments 
                WHERE (is_archived IS NULL OR is_archived = FALSE)
                  AND (status IS NULL OR status = 'Paid')
                GROUP BY order_id
            ) pay ON o.order_id = pay.order_id
            WHERE o.order_id = ?
            GROUP BY o.order_id, pay.total_paid
        `, [id]);

        if (orders.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];
        const isCurrentlyPaid = order.current_payment_status === 'Paid';
        const totalAmount = Number(order.total_amount) || 0;

        let newStatus = 'Paid';

        if (isCurrentlyPaid) {
            newStatus = 'Unpaid';
            await conn.query(`
                UPDATE payments 
                SET status = 'Pending' 
                WHERE order_id = ? 
                  AND (is_archived IS NULL OR is_archived = FALSE) 
                  AND (status IS NULL OR status = 'Paid')
            `, [id]);
        } else {
            newStatus = 'Paid';
            const [payments] = await conn.query(`
                SELECT payment_id, amount_paid, status 
                FROM payments 
                WHERE order_id = ? 
                  AND (is_archived IS NULL OR is_archived = FALSE)
                ORDER BY payment_id ASC
            `, [id]);

            if (payments.length > 0) {
                const sumAmount = payments.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0);
                if (sumAmount < totalAmount) {
                    await conn.query(`
                        UPDATE payments 
                        SET amount_paid = ?, status = 'Paid' 
                        WHERE payment_id = ?
                    `, [totalAmount, payments[0].payment_id]);
                    if (payments.length > 1) {
                        await conn.query(`
                            UPDATE payments 
                            SET status = 'Paid' 
                            WHERE order_id = ? 
                              AND (is_archived IS NULL OR is_archived = FALSE)
                        `, [id]);
                    }
                } else {
                    await conn.query(`
                        UPDATE payments 
                        SET status = 'Paid' 
                        WHERE order_id = ? 
                          AND (is_archived IS NULL OR is_archived = FALSE)
                    `, [id]);
                }
            } else {
                await conn.query(`
                    INSERT INTO payments (order_id, amount_paid, payment_method, reference_no, payment_date, status, is_archived) 
                    VALUES (?, ?, 'Cash', '', CURDATE(), 'Paid', FALSE)
                `, [id, totalAmount]);
            }
        }

        await conn.commit();

        res.json({
            success: true,
            order_id: Number(id),
            payment_status: newStatus
        });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        conn.release();
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM orders WHERE order_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ message: 'Order deleted successfully', order_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
