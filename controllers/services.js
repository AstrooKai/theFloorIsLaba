const pool = require('../config/db');

exports.getAllServices = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                service_id,
                service_name,
                price_per_kg,
                price_per_kg AS price,
                unit,
                category,
                turnaround_hours,
                status,
                description
            FROM service_types
            ORDER BY service_id ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT 
                service_id,
                service_name,
                price_per_kg,
                price_per_kg AS price,
                unit,
                category,
                turnaround_hours,
                status,
                description
            FROM service_types
            WHERE service_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createService = async (req, res) => {
    try {
        const { service_name, price, price_per_kg, unit = 'kg', category = 'Wash & fold', turnaround_hours = 24, status = 'Active', description } = req.body;
        const finalPrice = price_per_kg !== undefined ? price_per_kg : price;

        if (!service_name || finalPrice === undefined) {
            return res.status(400).json({ error: 'service_name and price are required' });
        }

        const finalDesc = description || `Standard laundry service charged at ₱${Number(finalPrice).toFixed(2)} per ${unit}.`;

        const [result] = await pool.query(
            'INSERT INTO service_types (service_name, price_per_kg, unit, category, turnaround_hours, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [service_name.trim(), Number(finalPrice), unit, category, Number(turnaround_hours), status, finalDesc]
        );

        res.status(201).json({
            service_id: result.insertId,
            service_name: service_name.trim(),
            price_per_kg: Number(finalPrice),
            price: Number(finalPrice),
            unit,
            category,
            turnaround_hours: Number(turnaround_hours),
            status,
            description: finalDesc
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { service_name, price, price_per_kg, unit, category, turnaround_hours, status, description } = req.body;
        const finalPrice = price_per_kg !== undefined ? price_per_kg : price;

        const updates = [];
        const params = [];

        if (service_name !== undefined) {
            updates.push('service_name = ?');
            params.push(service_name.trim());
        }
        if (finalPrice !== undefined) {
            updates.push('price_per_kg = ?');
            params.push(Number(finalPrice));
        }
        if (unit !== undefined) {
            updates.push('unit = ?');
            params.push(unit);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            params.push(category);
        }
        if (turnaround_hours !== undefined) {
            updates.push('turnaround_hours = ?');
            params.push(Number(turnaround_hours));
        }
        if (status !== undefined) {
            const normStatus = status === 'Inactive' ? 'Discontinued' : status;
            updates.push('status = ?');
            params.push(normStatus);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }

        if (updates.length > 0) {
            params.push(id);
            const [result] = await pool.query(`UPDATE service_types SET ${updates.join(', ')} WHERE service_id = ?`, params);
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Service not found' });
            }
        }

        const [rows] = await pool.query('SELECT *, price_per_kg AS price FROM service_types WHERE service_id = ?', [id]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.toggleServiceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT status FROM service_types WHERE service_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }

        const currentStatus = rows[0].status || 'Active';
        const isCurrentlyActive = currentStatus.toLowerCase() === 'active';
        const nextStatus = isCurrentlyActive ? 'Discontinued' : 'Active';

        await pool.query('UPDATE service_types SET status = ? WHERE service_id = ?', [nextStatus, id]);

        res.json({
            success: true,
            service_id: Number(id),
            status: nextStatus,
            message: `Service status updated to ${nextStatus}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE service_types SET status = 'Discontinued' WHERE service_id = ?", [id]);
        res.json({ message: 'Service discontinued successfully', service_id: Number(id), status: 'Discontinued' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
