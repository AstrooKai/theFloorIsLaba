const pool = require('../config/db');
const { isValidServiceCategory, isValidServiceName } = require('../utils/validation');

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
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.createService = async (req, res) => {
    try {
        const { service_name, price, price_per_kg, unit = 'kg', category = 'Wash & fold', turnaround_hours = 24, status = 'Active', description } = req.body;
        const finalPrice = price_per_kg !== undefined ? price_per_kg : price;

        if (!service_name || finalPrice === undefined) {
            return res.status(400).json({ error: 'service_name and price are required' });
        }
        const cleanServiceName = String(service_name).trim();
        const numericPrice = Number(finalPrice);
        const hours = Number(turnaround_hours);
        if (!isValidServiceName(cleanServiceName) || !Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > 99999.99 ||
            !['kg', 'piece'].includes(unit) || !Number.isSafeInteger(hours) || hours <= 0 ||
            !['Active', 'Discontinued'].includes(status) || !isValidServiceCategory(category) ||
            (description !== undefined && String(description).length > 255)) {
            return res.status(400).json({ error: 'Service name, rate, unit, turnaround, status, category, or description is invalid.' });
        }

        const finalDesc = description || `Standard laundry service charged at ₱${numericPrice.toFixed(2)} per ${unit}.`;

        const [result] = await pool.query(
            'INSERT INTO service_types (service_name, price_per_kg, unit, category, turnaround_hours, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [cleanServiceName, numericPrice, unit, String(category).trim(), hours, status, finalDesc]
        );

        res.status(201).json({
            service_id: result.insertId,
            service_name: cleanServiceName,
            price_per_kg: numericPrice,
            price: numericPrice,
            unit,
            category: String(category).trim(),
            turnaround_hours: hours,
            status,
            description: finalDesc
        });
    } catch (error) {
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { service_name, price, price_per_kg, unit, category, turnaround_hours, status, description } = req.body;
        const finalPrice = price_per_kg !== undefined ? price_per_kg : price;
        const finalStatus = status === 'Inactive' ? 'Discontinued' : status;
        const numericPrice = finalPrice === undefined ? undefined : Number(finalPrice);
        const hours = turnaround_hours === undefined ? undefined : Number(turnaround_hours);
        if ((service_name !== undefined && !isValidServiceName(String(service_name).trim())) ||
            (numericPrice !== undefined && (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > 99999.99)) ||
            (unit !== undefined && !['kg', 'piece'].includes(unit)) ||
            (hours !== undefined && (!Number.isSafeInteger(hours) || hours <= 0)) ||
            (finalStatus !== undefined && !['Active', 'Discontinued'].includes(finalStatus)) ||
            (category !== undefined && !isValidServiceCategory(category)) ||
            (description !== undefined && String(description).length > 255)) {
            return res.status(400).json({ error: 'Service name, rate, unit, turnaround, status, category, or description is invalid.' });
        }

        const updates = [];
        const params = [];

        if (service_name !== undefined) {
            updates.push('service_name = ?');
            params.push(String(service_name).trim());
        }
        if (finalPrice !== undefined) {
            updates.push('price_per_kg = ?');
            params.push(numericPrice);
        }
        if (unit !== undefined) {
            updates.push('unit = ?');
            params.push(unit);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            params.push(String(category).trim());
        }
        if (turnaround_hours !== undefined) {
            updates.push('turnaround_hours = ?');
            params.push(hours);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            params.push(finalStatus);
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
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
        console.error('Controller error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
