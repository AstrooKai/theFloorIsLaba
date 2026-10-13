const pool = require('../config/db');

exports.getAllServices = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                service_id,
                service_name,
                price_per_kg,
                price_per_kg AS price,
                'kg' AS unit,
                CASE 
                    WHEN LOWER(service_name) LIKE '%dry clean%' THEN 'Dry cleaning'
                    ELSE 'Wash & fold'
                END AS category,
                CASE 
                    WHEN LOWER(service_name) LIKE '%dry clean%' THEN 72
                    WHEN LOWER(service_name) LIKE '%iron%' THEN 12
                    ELSE 24
                END AS turnaround_hours,
                'Active' AS status,
                CONCAT('Standard laundry service charged at ₱', price_per_kg, ' per kg.') AS description
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
                'kg' AS unit,
                CASE 
                    WHEN LOWER(service_name) LIKE '%dry clean%' THEN 'Dry cleaning'
                    ELSE 'Wash & fold'
                END AS category,
                CASE 
                    WHEN LOWER(service_name) LIKE '%dry clean%' THEN 72
                    WHEN LOWER(service_name) LIKE '%iron%' THEN 12
                    ELSE 24
                END AS turnaround_hours,
                'Active' AS status,
                CONCAT('Standard laundry service charged at ₱', price_per_kg, ' per kg.') AS description
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
        const { service_name, price, price_per_kg } = req.body;
        const finalPrice = price_per_kg !== undefined ? price_per_kg : price;

        if (!service_name || finalPrice === undefined) {
            return res.status(400).json({ error: 'service_name and price are required' });
        }

        const [result] = await pool.query(
            'INSERT INTO service_types (service_name, price_per_kg) VALUES (?, ?)',
            [service_name, Number(finalPrice)]
        );

        res.status(201).json({
            service_id: result.insertId,
            service_name,
            price_per_kg: Number(finalPrice),
            price: Number(finalPrice),
            unit: 'kg',
            category: service_name.toLowerCase().includes('dry clean') ? 'Dry cleaning' : 'Wash & fold',
            status: 'Active'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { service_name, price, price_per_kg } = req.body;
        const finalPrice = price_per_kg !== undefined ? price_per_kg : price;

        const [result] = await pool.query(
            'UPDATE service_types SET service_name = ?, price_per_kg = ? WHERE service_id = ?',
            [service_name, Number(finalPrice), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.json({
            service_id: Number(id),
            service_name,
            price_per_kg: Number(finalPrice),
            price: Number(finalPrice),
            unit: 'kg',
            category: service_name.toLowerCase().includes('dry clean') ? 'Dry cleaning' : 'Wash & fold',
            status: 'Active'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM service_types WHERE service_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.json({ message: 'Service deleted successfully', service_id: Number(id) });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete service type used in existing orders' });
        }
        res.status(500).json({ error: error.message });
    }
};
