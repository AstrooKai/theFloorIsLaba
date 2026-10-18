const pool = require('../config/db');

exports.getAllPayments = async (req, res) => {
    try {
        const includeArchived = req.query.include_archived === 'true' || req.query.history === 'true';
        const archiveFilter = includeArchived ? '' : 'WHERE (p.is_archived IS NULL OR p.is_archived = FALSE)';

        const [rows] = await pool.query(`
            SELECT 
                p.payment_id,
                p.order_id,
                p.amount_paid,
                p.amount_paid AS amount,
                p.payment_method,
                p.payment_method AS method,
                DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
                DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS paid_at,
                COALESCE(p.status, 'Paid') AS status,
                COALESCE(p.reference_no, '') AS reference_no,
                COALESCE(p.is_archived, FALSE) AS is_archived,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.phone AS contact,
                p.created_at
            FROM payments p
            JOIN orders o ON p.order_id = o.order_id
            JOIN customers c ON o.customer_id = c.customer_id
            ${archiveFilter}
            ORDER BY p.payment_date DESC, p.payment_id DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT 
                p.payment_id,
                p.order_id,
                p.amount_paid,
                p.amount_paid AS amount,
                p.payment_method,
                p.payment_method AS method,
                DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS payment_date,
                DATE_FORMAT(p.payment_date, '%Y-%m-%d') AS paid_at,
                COALESCE(p.status, 'Paid') AS status,
                COALESCE(p.reference_no, '') AS reference_no,
                COALESCE(p.is_archived, FALSE) AS is_archived,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.phone AS contact,
                p.created_at
            FROM payments p
            JOIN orders o ON p.order_id = o.order_id
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE p.payment_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createPayment = async (req, res) => {
    try {
        const { order_id, amount, amount_paid, method, payment_method, paid_at, payment_date, reference_no, status } = req.body;
        const finalAmount = amount_paid !== undefined ? amount_paid : amount;
        const finalMethod = payment_method || method || 'Cash';
        const finalDate = payment_date || paid_at || new Date().toISOString().split('T')[0];
        const finalRef = (finalMethod === 'Cash') ? '' : (reference_no || '').trim();
        const finalStatus = status || 'Paid';

        if (!order_id || finalAmount === undefined) {
            return res.status(400).json({ error: 'order_id and amount are required' });
        }

        const [orderRows] = await pool.query('SELECT order_id FROM orders WHERE order_id = ?', [order_id]);
        if (orderRows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const [result] = await pool.query(
            'INSERT INTO payments (order_id, amount_paid, payment_method, reference_no, payment_date, status, is_archived) VALUES (?, ?, ?, ?, ?, ?, FALSE)',
            [order_id, Number(finalAmount), finalMethod, finalRef, finalDate, finalStatus]
        );

        res.status(201).json({
            payment_id: result.insertId,
            order_id: Number(order_id),
            amount_paid: Number(finalAmount),
            amount: Number(finalAmount),
            payment_method: finalMethod,
            method: finalMethod,
            reference_no: finalRef,
            payment_date: finalDate,
            paid_at: finalDate,
            status: finalStatus,
            is_archived: false
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, amount_paid, method, payment_method, paid_at, payment_date, reference_no, status, is_archived } = req.body;
        const finalAmount = amount_paid !== undefined ? amount_paid : amount;
        const finalMethod = payment_method || method;
        const finalDate = payment_date || paid_at;

        const updates = [];
        const params = [];

        if (finalAmount !== undefined) {
            updates.push('amount_paid = ?');
            params.push(Number(finalAmount));
        }
        if (finalMethod) {
            updates.push('payment_method = ?');
            params.push(finalMethod);
        }
        if (reference_no !== undefined) {
            updates.push('reference_no = ?');
            params.push((finalMethod === 'Cash') ? '' : String(reference_no).trim());
        }
        if (finalDate) {
            updates.push('payment_date = ?');
            params.push(finalDate);
        }
        if (status) {
            updates.push('status = ?');
            params.push(status);
        }
        if (is_archived !== undefined) {
            updates.push('is_archived = ?');
            params.push(Boolean(is_archived));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

        params.push(id);
        const [result] = await pool.query(`UPDATE payments SET ${updates.join(', ')} WHERE payment_id = ?`, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json({
            payment_id: Number(id),
            amount_paid: finalAmount !== undefined ? Number(finalAmount) : undefined,
            amount: finalAmount !== undefined ? Number(finalAmount) : undefined,
            payment_method: finalMethod,
            method: finalMethod,
            reference_no: reference_no,
            payment_date: finalDate,
            paid_at: finalDate,
            status: status || 'Paid',
            is_archived: is_archived !== undefined ? Boolean(is_archived) : undefined
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.archivePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            'UPDATE payments SET is_archived = TRUE WHERE payment_id = ?',
            [id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Payment not found' });
        res.json({ success: true, message: 'Payment archived successfully', payment_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.unarchivePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            'UPDATE payments SET is_archived = FALSE WHERE payment_id = ?',
            [id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Payment not found' });
        res.json({ success: true, message: 'Payment unarchived successfully', payment_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.togglePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT payment_id, order_id, amount_paid, status FROM payments WHERE payment_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        const current = rows[0].status || 'Paid';
        const next = (current === 'Paid') ? 'Pending' : 'Paid';

        await pool.query('UPDATE payments SET status = ? WHERE payment_id = ?', [next, id]);

        res.json({
            success: true,
            payment_id: Number(id),
            status: next
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM payments WHERE payment_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json({ message: 'Payment deleted successfully', payment_id: Number(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
