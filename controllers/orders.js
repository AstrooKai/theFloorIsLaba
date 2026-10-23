const pool = require('../config/db');
const { cleanName, isValidDate, isValidPersonName, normalizePhone, todayManila } = require('../utils/validation');
const { REQUIRE_PAYMENT_BEFORE_COMPLETE } = require('../utils/business-rules');

const isProductionRole = role => ['washer', 'folder'].includes(String(role || '').toLowerCase());

function redactOrderForProductionRole(order) {
    const {
        customer_id,
        customer_phone,
        contact,
        street_address,
        street,
        barangay,
        address,
        total_amount,
        delivery_fee,
        total,
        total_paid,
        payment_status,
        payments,
        ...safeOrder
    } = order;

    if (Array.isArray(safeOrder.items)) {
        safeOrder.items = safeOrder.items.map(({ subtotal, ...item }) => item);
    }
    return safeOrder;
}

exports.getAllOrders = async (req, res) => {
    try {
        const includeArchived = !isProductionRole(req.staff?.role) &&
            (req.query.include_archived === 'true' || req.query.history === 'true');
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
                (
                    SELECT COUNT(*) 
                    FROM deliveries d 
                    WHERE d.order_id = o.order_id 
                      AND d.status = 'Completed' 
                      AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                ) AS completed_runs_count,
                MAX(oi.service_id) AS service_id,
                COALESCE(SUM(oi.weight_kg), 1.00) AS weight_kg,
                COALESCE(SUM(oi.subtotal), 0) + COALESCE((
                    SELECT SUM(d.fee) FROM deliveries d
                    WHERE d.order_id = o.order_id
                      AND d.type = 'Delivery'
                      AND d.status <> 'Cancelled'
                      AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                ), 0) AS total_amount,
                COALESCE((
                    SELECT SUM(d.fee) FROM deliveries d
                    WHERE d.order_id = o.order_id
                      AND d.type = 'Delivery'
                      AND d.status <> 'Cancelled'
                      AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                ), 0) AS delivery_fee,
                COALESCE(SUM(oi.subtotal), 0) + COALESCE((
                    SELECT SUM(d.fee) FROM deliveries d
                    WHERE d.order_id = o.order_id
                      AND d.type = 'Delivery'
                      AND d.status <> 'Cancelled'
                      AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                ), 0) AS total,
                COALESCE(pay.total_paid, 0) AS total_paid,
                CASE 
                    WHEN COALESCE(pay.total_paid, 0) >= (
                        COALESCE(SUM(oi.subtotal), 0) + COALESCE((
                            SELECT SUM(d.fee) FROM deliveries d
                            WHERE d.order_id = o.order_id
                              AND d.type = 'Delivery'
                              AND d.status <> 'Cancelled'
                              AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                        ), 0)
                    ) AND (
                        COALESCE(SUM(oi.subtotal), 0) + COALESCE((
                            SELECT SUM(d.fee) FROM deliveries d
                            WHERE d.order_id = o.order_id
                              AND d.type = 'Delivery'
                              AND d.status <> 'Cancelled'
                              AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                        ), 0)
                    ) > 0 THEN 'Paid'
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
        res.json(isProductionRole(req.staff?.role) ? rows.map(redactOrderForProductionRole) : rows);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const archivedFilter = isProductionRole(req.staff?.role)
            ? 'AND (o.is_archived IS NULL OR o.is_archived = FALSE)'
            : '';
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
                (
                    SELECT COUNT(*) 
                    FROM deliveries d 
                    WHERE d.order_id = o.order_id 
                      AND d.status = 'Completed' 
                      AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                ) AS completed_runs_count,
                COALESCE(SUM(oi.subtotal), 0) + COALESCE((
                    SELECT SUM(d.fee) FROM deliveries d
                    WHERE d.order_id = o.order_id
                      AND d.type = 'Delivery'
                      AND d.status <> 'Cancelled'
                      AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                ), 0) AS total,
                COALESCE(SUM(oi.subtotal), 0) + COALESCE((
                    SELECT SUM(d.fee) FROM deliveries d
                    WHERE d.order_id = o.order_id
                      AND d.type = 'Delivery'
                      AND d.status <> 'Cancelled'
                      AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                ), 0) AS total_amount,
                COALESCE((
                    SELECT SUM(d.fee) FROM deliveries d
                    WHERE d.order_id = o.order_id
                      AND d.type = 'Delivery'
                      AND d.status <> 'Cancelled'
                      AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                ), 0) AS delivery_fee,
                COALESCE(pay.total_paid, 0) AS total_paid,
                CASE 
                    WHEN COALESCE(pay.total_paid, 0) >= (
                        COALESCE(SUM(oi.subtotal), 0) + COALESCE((
                            SELECT SUM(d.fee) FROM deliveries d
                            WHERE d.order_id = o.order_id
                              AND d.type = 'Delivery'
                              AND d.status <> 'Cancelled'
                              AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                        ), 0)
                    ) AND (
                        COALESCE(SUM(oi.subtotal), 0) + COALESCE((
                            SELECT SUM(d.fee) FROM deliveries d
                            WHERE d.order_id = o.order_id
                              AND d.type = 'Delivery'
                              AND d.status <> 'Cancelled'
                              AND (d.is_archived IS NULL OR d.is_archived = FALSE)
                        ), 0)
                    ) > 0 THEN 'Paid'
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
            WHERE o.order_id = ? ${archivedFilter}
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

        order.items = items;
        if (!isProductionRole(req.staff?.role)) {
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
            order.payments = payments;
        }

        res.json(isProductionRole(req.staff?.role) ? redactOrderForProductionRole(order) : order);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getOrderStatuses = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT status_id, status_name FROM order_statuses ORDER BY status_id ASC');
        res.json(rows);
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createOrder = async (req, res) => {
    const staffId = Number(req.staff?.staff_id);
    if (!Number.isSafeInteger(staffId) || staffId <= 0) {
        return res.status(401).json({ error: 'Staff authentication required' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const {
            customer_id,
            customer_name,
            contact,
            address,
            release_type = 'Pickup',
            release_date = null,
            order_date,
            items = []
        } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'At least one service item is required' });
        }
        if (!['Pickup', 'Delivery'].includes(release_type)) {
            await conn.rollback();
            return res.status(400).json({ error: 'Release type must be Pickup or Delivery' });
        }
        const finalOrderDate = order_date || todayManila();
        if (!isValidDate(finalOrderDate) || (release_date && !isValidDate(release_date))) {
            await conn.rollback();
            return res.status(400).json({ error: 'Order dates must be valid YYYY-MM-DD dates' });
        }

        const pricedItems = [];
        for (const item of items) {
            const serviceId = Number(item.service_id);
            const weight = Number(item.weight_kg);
            if (!Number.isSafeInteger(serviceId) || !Number.isFinite(weight) || weight <= 0 || weight > 999.99) {
                await conn.rollback();
                return res.status(400).json({ error: 'Each service item needs a valid service and a weight greater than 0 and no more than 999.99' });
            }
            const [services] = await conn.query(
                "SELECT price_per_kg FROM service_types WHERE service_id = ? AND status = 'Active'",
                [serviceId]
            );
            if (services.length === 0) {
                await conn.rollback();
                return res.status(400).json({ error: `Service ${serviceId} does not exist or is not active` });
            }
            const subtotal = Math.round(weight * Number(services[0].price_per_kg) * 100) / 100;
            if (subtotal > 99999999.99) {
                await conn.rollback();
                return res.status(400).json({ error: 'A service line exceeds the maximum supported order amount.' });
            }
            pricedItems.push({ service_id: serviceId, weight_kg: weight, subtotal });
        }
        const computedTotal = pricedItems.reduce((sum, item) => sum + item.subtotal, 0);
        if (computedTotal > 99999999.99) {
            await conn.rollback();
            return res.status(400).json({ error: 'Order total exceeds the maximum supported amount.' });
        }

        // Resolve customer
        let finalCustomerId = customer_id !== undefined && customer_id !== null && customer_id !== '' ? Number(customer_id) : null;
        let firstName = cleanName(req.body.first_name || '');
        let lastName = cleanName(req.body.last_name || '');
        if (!finalCustomerId && !firstName && customer_name) {
            const nameParts = cleanName(customer_name).split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ');
        }
        const contactNo = (contact || req.body.phone || '').trim();
        const normalizedContactNo = contactNo ? normalizePhone(contactNo) : '';
        const streetAddr = (req.body.street_address || req.body.street || '').trim();
        const barangayVal = (req.body.barangay || '').trim();

        if (customer_id !== undefined && customer_id !== null && customer_id !== '' &&
            (!Number.isSafeInteger(finalCustomerId) || finalCustomerId <= 0)) {
            await conn.rollback();
            return res.status(400).json({ error: 'Invalid customer ID' });
        }
        if ((!finalCustomerId || firstName || lastName) &&
            (!isValidPersonName(firstName) || !isValidPersonName(lastName))) {
            await conn.rollback();
            return res.status(400).json({ error: 'Enter valid first and last names (maximum 50 characters).' });
        }
        if (contactNo && !normalizedContactNo) {
            await conn.rollback();
            return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number starting with 09' });
        }
        if (!finalCustomerId && (!normalizedContactNo || !streetAddr || !barangayVal)) {
            await conn.rollback();
            return res.status(400).json({ error: 'A new customer requires a valid phone number, street address, and barangay.' });
        }

        if (finalCustomerId) {
            const [custRows] = await conn.query(
                "SELECT customer_id FROM customers WHERE customer_id = ? AND status = 'Active' AND (is_archived IS NULL OR is_archived = FALSE)",
                [finalCustomerId]
            );
            if (custRows.length > 0) {
                if (streetAddr || barangayVal || contactNo) {
                    await conn.query(
                        'UPDATE customers SET street_address = COALESCE(NULLIF(?, ""), street_address), barangay = COALESCE(NULLIF(?, ""), barangay), phone = COALESCE(NULLIF(?, ""), phone) WHERE customer_id = ?',
                        [streetAddr, barangayVal, normalizedContactNo, finalCustomerId]
                    );
                }
            } else {
                await conn.rollback();
                return res.status(400).json({ error: 'Customer not found or inactive' });
            }
        }

        if (!finalCustomerId) {
            if (!firstName && customer_name) {
                const parts = customer_name.trim().split(/\s+/);
                firstName = parts[0] || 'Customer';
                lastName = parts.slice(1).join(' ') || 'Customer';
            }

            let found = [];
            if (firstName && firstName.toLowerCase() !== 'customer') {
                const [byName] = await conn.query(
                    'SELECT customer_id FROM customers WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?) LIMIT 1',
                    [firstName, lastName]
                );
                found = byName;
            } else if (contactNo) {
                const [byPhone] = await conn.query(
                    'SELECT customer_id FROM customers WHERE phone = ? AND phone != "" LIMIT 1',
                    [normalizedContactNo]
                );
                found = byPhone;
            }

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
                    [firstName, lastName, normalizedContactNo, streetAddr, barangayVal]
                );
                finalCustomerId = createdCust.insertId;
            }
        }

        // Initial status: Received
        const finalStatusId = 1;

        // Insert order
        const [orderResult] = await conn.query(
            'INSERT INTO orders (customer_id, staff_id, status_id, order_date, release_type, release_date) VALUES (?, ?, ?, ?, ?, ?)',
            [finalCustomerId, staffId, finalStatusId, finalOrderDate, release_type, release_date]
        );

        const newOrderId = orderResult.insertId;

        // Insert order items
        for (const item of pricedItems) {
            await conn.query(
                'INSERT INTO order_items (order_id, service_id, weight_kg, subtotal) VALUES (?, ?, ?, ?)',
                [newOrderId, item.service_id, item.weight_kg, item.subtotal]
            );
        }

        await conn.commit();

        res.status(201).json({
            order_id: newOrderId,
            customer_id: finalCustomerId,
            customer_name: `${firstName} ${lastName}`.trim() || customer_name || 'Customer',
            contact: normalizedContactNo || '',
            address: streetAddr || address || '',
            order_date: finalOrderDate,
            order_status: 'Received',
            total: Math.round(computedTotal * 100) / 100
        });
    } catch (error) {
        await conn.rollback();
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
};

exports.updateOrder = async (req, res) => {
    if (isProductionRole(req.staff?.role) &&
        Object.keys(req.body || {}).some(key => !['order_status', 'status_id'].includes(key))) {
        return res.status(403).json({ error: 'Washers and Folders may only update order status.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const { id } = req.params;
        const { order_status, status_id, release_type, release_date, customer_name, contact, address } = req.body;

        const [existing] = await conn.query(`
            SELECT o.*, os.status_name
            FROM orders o
            JOIN order_statuses os ON os.status_id = o.status_id
            WHERE o.order_id = ?
            FOR UPDATE
        `, [id]);
        if (existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        const currentOrder = existing[0];
        if (currentOrder.is_archived) {
            await conn.rollback();
            return res.status(400).json({ error: 'Archived orders must be restored before they can be changed.' });
        }
        const finalReleaseType = release_type || currentOrder.release_type;
        if (!['Pickup', 'Delivery'].includes(finalReleaseType)) {
            await conn.rollback();
            return res.status(400).json({ error: 'Release type must be Pickup or Delivery' });
        }
        if (release_type && release_type !== currentOrder.release_type) {
            const [runRows] = await conn.query(
                'SELECT delivery_id FROM deliveries WHERE order_id = ? LIMIT 1',
                [id]
            );
            if (currentOrder.status_name !== 'Received' || runRows.length > 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Release type can only change before processing starts and before a run is scheduled.' });
            }
        }
        const [statusRows] = await conn.query('SELECT status_id, status_name FROM order_statuses');
        let targetStatus = currentOrder.status_name;
        if (order_status !== undefined) {
            targetStatus = String(order_status);
        } else if (status_id !== undefined) {
            const resolved = statusRows.find(row => Number(row.status_id) === Number(status_id));
            if (!resolved) {
                await conn.rollback();
                return res.status(400).json({ error: 'Invalid order status' });
            }
            targetStatus = resolved.status_name;
        }
        const targetStatusRow = statusRows.find(row => row.status_name === targetStatus);
        if (!targetStatusRow) {
            await conn.rollback();
            return res.status(400).json({ error: 'Invalid order status' });
        }

        const steps = finalReleaseType === 'Delivery'
            ? ['Received', 'Washing', 'Folding', 'Out for Delivery', 'Completed']
            : ['Received', 'Washing', 'Folding', 'Ready for Pickup', 'Completed'];
        const currentIndex = steps.indexOf(currentOrder.status_name);
        const targetIndex = steps.indexOf(targetStatus);
        const isManager = String(req.staff?.role || '').toLowerCase() === 'manager';
        const reopening = req.body.reopen === true;
        if (reopening && !isManager) {
            await conn.rollback();
            return res.status(403).json({ error: 'Only a Manager may reopen a completed order' });
        }
        const isNextStep = targetStatus === currentOrder.status_name || targetIndex === currentIndex + 1;
        const managerReopen = isManager && reopening && currentOrder.status_name === 'Completed' && targetIndex >= 0 && targetIndex < currentIndex;
        if (!isNextStep && !managerReopen) {
            await conn.rollback();
            return res.status(400).json({ error: 'Order status must advance by one step; Completed orders are final unless a Manager explicitly reopens them' });
        }
        if (targetStatus !== currentOrder.status_name && targetStatus === 'Out for Delivery' && !managerReopen) {
            await conn.rollback();
            return res.status(400).json({ error: 'Start the delivery run to move this order to Out for Delivery.' });
        }
        if (targetStatus !== currentOrder.status_name && targetStatus === 'Completed' && finalReleaseType === 'Delivery') {
            await conn.rollback();
            return res.status(400).json({ error: 'Complete the delivery run to complete a Delivery order.' });
        }
        if (targetStatus !== currentOrder.status_name && targetStatus === 'Completed' && REQUIRE_PAYMENT_BEFORE_COMPLETE) {
            const [balanceRows] = await conn.query(`
                SELECT
                    COALESCE((SELECT SUM(oi.subtotal) FROM order_items oi WHERE oi.order_id = o.order_id), 0) +
                    COALESCE((SELECT SUM(d.fee) FROM deliveries d WHERE d.order_id = o.order_id
                        AND d.type = 'Delivery' AND d.status <> 'Cancelled'
                        AND (d.is_archived IS NULL OR d.is_archived = FALSE)), 0) AS total,
                    COALESCE((SELECT SUM(p.amount_paid) FROM payments p WHERE p.order_id = o.order_id
                        AND p.status = 'Paid' AND (p.is_archived IS NULL OR p.is_archived = FALSE)), 0) AS total_paid
                FROM orders o
                WHERE o.order_id = ?
            `, [id]);
            if (Number(balanceRows[0].total_paid) + 0.001 < Number(balanceRows[0].total)) {
                await conn.rollback();
                return res.status(400).json({ error: 'The order must be fully paid before it can be completed.' });
            }
        }
        if (['washer', 'folder'].includes(String(req.staff?.role || '').toLowerCase()) &&
            targetIndex > steps.indexOf(finalReleaseType === 'Delivery' ? 'Out for Delivery' : 'Ready for Pickup')) {
            await conn.rollback();
            return res.status(403).json({ error: 'Washers and Folders may only advance orders up to the ready stage' });
        }

        const updates = [];
        const params = [];

        if (targetStatus !== currentOrder.status_name) {
            updates.push('status_id = ?');
            params.push(targetStatusRow.status_id);
        }
        if (release_type) {
            updates.push('release_type = ?');
            params.push(release_type);
        }
        if (targetStatus === 'Completed') {
            updates.push('release_date = ?');
            params.push(todayManila());
        } else if (release_date !== undefined) {
            if (release_date !== null && !isValidDate(release_date)) {
                await conn.rollback();
                return res.status(400).json({ error: 'Release date must be a valid YYYY-MM-DD date' });
            }
            updates.push('release_date = ?');
            params.push(release_date);
        }

        if (updates.length > 0) {
            params.push(id);
            await conn.query(`UPDATE orders SET ${updates.join(', ')} WHERE order_id = ?`, params);
        }

        // Update customer
        const reqCustId = req.body.customer_id !== undefined ? Number(req.body.customer_id) : null;
        if (req.body.customer_id !== undefined && (!Number.isSafeInteger(reqCustId) || reqCustId <= 0)) {
            await conn.rollback();
            return res.status(400).json({ error: 'Invalid customer ID' });
        }
        if (reqCustId && reqCustId !== existing[0].customer_id) {
            const [customerRows] = await conn.query(
                "SELECT customer_id FROM customers WHERE customer_id = ? AND status = 'Active' AND (is_archived IS NULL OR is_archived = FALSE)",
                [reqCustId]
            );
            if (customerRows.length === 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Customer not found or inactive' });
            }
            await conn.query('UPDATE orders SET customer_id = ? WHERE order_id = ?', [reqCustId, id]);
        }

        const targetCustId = reqCustId || existing[0].customer_id;
        const firstName = (req.body.first_name || '').trim();
        const lastName = (req.body.last_name || '').trim();
        const streetVal = (req.body.street_address || req.body.street || address || '').trim();
        const brgyVal = (req.body.barangay || '').trim();
        const phoneVal = (contact || req.body.phone || '').trim();

        const custUpdates = [];
        const custParams = [];

        if (firstName || lastName) {
            const finalFirstName = cleanName(firstName || existing[0].first_name);
            const finalLastName = cleanName(lastName || existing[0].last_name);
            if (!isValidPersonName(finalFirstName) || !isValidPersonName(finalLastName)) {
                await conn.rollback();
                return res.status(400).json({ error: 'Names can only contain letters, spaces, apostrophes, periods and hyphens.' });
            }
            if (firstName) { custUpdates.push('first_name = ?'); custParams.push(finalFirstName); }
            if (lastName) { custUpdates.push('last_name = ?'); custParams.push(finalLastName); }
        } else if (customer_name) {
            const parts = cleanName(customer_name).split(' ');
            if (!isValidPersonName(parts[0] || '') || !isValidPersonName(parts.slice(1).join(' '))) {
                await conn.rollback();
                return res.status(400).json({ error: 'Names can only contain letters, spaces, apostrophes, periods and hyphens.' });
            }
            custUpdates.push('first_name = ?', 'last_name = ?');
            custParams.push(parts[0] || '', parts.slice(1).join(' ') || '');
        }
        if (phoneVal) {
            const normalizedPhone = normalizePhone(phoneVal);
            if (!normalizedPhone) {
                await conn.rollback();
                return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number starting with 09' });
            }
            custUpdates.push('phone = ?');
            custParams.push(normalizedPhone);
        }
        if (streetVal) {
            custUpdates.push('street_address = ?');
            custParams.push(streetVal);
        }
        if (brgyVal) {
            custUpdates.push('barangay = ?');
            custParams.push(brgyVal);
        }

        if (custUpdates.length > 0) {
            custParams.push(targetCustId);
            await conn.query(`UPDATE customers SET ${custUpdates.join(', ')} WHERE customer_id = ?`, custParams);
        }

        let pricedItems = null;
        if (req.body.items !== undefined) {
            if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'At least one service item is required' });
            }
            const [activePaymentRows] = await conn.query(
                'SELECT payment_id FROM payments WHERE order_id = ? AND (is_archived IS NULL OR is_archived = FALSE) LIMIT 1',
                [id]
            );
            if (activePaymentRows.length > 0) {
                await conn.rollback();
                return res.status(400).json({ error: 'Service lines cannot be changed while active payment records exist.' });
            }
            pricedItems = [];
            for (const item of req.body.items) {
                const serviceId = Number(item.service_id);
                const weight = Number(item.weight_kg);
                if (!Number.isSafeInteger(serviceId) || !Number.isFinite(weight) || weight <= 0 || weight > 999.99) {
                    await conn.rollback();
                    return res.status(400).json({ error: 'Each service item needs a valid service and a weight greater than 0 and no more than 999.99' });
                }
                const [services] = await conn.query(
                    "SELECT price_per_kg FROM service_types WHERE service_id = ? AND status = 'Active'",
                    [serviceId]
                );
                if (services.length === 0) {
                    await conn.rollback();
                    return res.status(400).json({ error: `Service ${serviceId} does not exist or is not active` });
                }
                const subtotal = Math.round(weight * Number(services[0].price_per_kg) * 100) / 100;
                if (subtotal > 99999999.99) {
                    await conn.rollback();
                    return res.status(400).json({ error: 'A service line exceeds the maximum supported order amount.' });
                }
                pricedItems.push({
                    service_id: serviceId,
                    weight_kg: weight,
                    subtotal
                });
            }
            if (pricedItems.reduce((sum, item) => sum + item.subtotal, 0) > 99999999.99) {
                await conn.rollback();
                return res.status(400).json({ error: 'Order total exceeds the maximum supported amount.' });
            }
            await conn.query('DELETE FROM order_items WHERE order_id = ?', [id]);
            for (const item of pricedItems) {
                await conn.query(
                    'INSERT INTO order_items (order_id, service_id, weight_kg, subtotal) VALUES (?, ?, ?, ?)',
                    [id, item.service_id, item.weight_kg, item.subtotal]
                );
            }
        }

        const [totals] = await conn.query(`
            SELECT COALESCE(SUM(oi.subtotal), 0) + COALESCE((
                SELECT SUM(d.fee) FROM deliveries d
                WHERE d.order_id = o.order_id
                  AND d.type = 'Delivery'
                  AND d.status <> 'Cancelled'
                  AND (d.is_archived IS NULL OR d.is_archived = FALSE)
            ), 0) AS total,
            COALESCE((
                SELECT SUM(p.amount_paid) FROM payments p
                WHERE p.order_id = o.order_id AND (p.status IS NULL OR p.status = 'Paid')
                  AND (p.is_archived IS NULL OR p.is_archived = FALSE)
            ), 0) AS total_paid,
            os.status_name
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.order_id
            JOIN order_statuses os ON os.status_id = o.status_id
            WHERE o.order_id = ?
            GROUP BY o.order_id, os.status_name
        `, [id]);
        await conn.commit();

        res.json({
            order_id: Number(id),
            order_status: targetStatus,
            total: Number(totals[0]?.total || 0)
        });
    } catch (error) {
        await conn.rollback();
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
};

exports.archiveOrder = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const { id } = req.params;
        const [rows] = await conn.query(`
            SELECT os.status_name,
                   COALESCE((SELECT SUM(oi.subtotal) FROM order_items oi WHERE oi.order_id = o.order_id), 0)
                     + COALESCE((SELECT SUM(d.fee) FROM deliveries d
                         WHERE d.order_id = o.order_id AND d.type = 'Delivery' AND d.status <> 'Cancelled'
                           AND (d.is_archived IS NULL OR d.is_archived = FALSE)), 0) AS total,
                   COALESCE((SELECT SUM(p.amount_paid) FROM payments p
                       WHERE p.order_id = o.order_id AND (p.status IS NULL OR p.status = 'Paid')
                         AND (p.is_archived IS NULL OR p.is_archived = FALSE)), 0) AS total_paid
            FROM orders o
            JOIN order_statuses os ON os.status_id = o.status_id
            WHERE o.order_id = ?
            FOR UPDATE
        `, [id]);
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }
        if (rows[0].status_name !== 'Completed' ||
            Math.abs(Number(rows[0].total_paid) - Number(rows[0].total)) > 0.001) {
            await conn.rollback();
            return res.status(400).json({ error: 'Only completed and fully paid orders can be archived' });
        }
        await conn.query('UPDATE orders SET is_archived = TRUE WHERE order_id = ?', [id]);
        await conn.commit();
        res.json({ success: true, message: 'Order archived successfully', order_id: Number(id) });
    } catch (error) {
        await conn.rollback();
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
};

exports.unarchiveOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('UPDATE orders SET is_archived = FALSE WHERE order_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, message: 'Order unarchived successfully', order_id: Number(id) });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
