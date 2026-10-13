const pool = require('../config/db');

exports.getDashboardSummary = async (req, res) => {
    try {
        const [
            [customerCount],
            [orderCount],
            [completedCount],
            [magmaCount],
            [revenueSum],
            [deliveryCount],
            latestOrders,
            serviceBreakdown
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) AS total FROM customers'),
            pool.query('SELECT COUNT(*) AS total FROM orders'),
            pool.query(`
                SELECT COUNT(*) AS total 
                FROM orders o 
                JOIN order_statuses os ON o.status_id = os.status_id 
                WHERE os.status_name = 'Completed'
            `),
            pool.query(`
                SELECT COUNT(*) AS total 
                FROM orders o 
                JOIN order_statuses os ON o.status_id = os.status_id 
                WHERE os.status_name != 'Completed'
            `),
            pool.query('SELECT COALESCE(SUM(amount_paid), 0) AS total FROM payments'),
            pool.query("SELECT COUNT(*) AS total FROM orders WHERE release_type = 'Delivery'"),
            pool.query(`
                SELECT 
                    o.order_id,
                    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                    DATE_FORMAT(o.order_date, '%b %d, %Y') AS formatted_date,
                    o.order_date,
                    os.status_name AS order_status,
                    CASE 
                        WHEN os.status_name = 'Completed' THEN 'Safe Zone'
                        ELSE 'In the Magma'
                    END AS stage,
                    COALESCE(SUM(oi.subtotal), 0) AS total
                FROM orders o
                JOIN customers c ON o.customer_id = c.customer_id
                JOIN order_statuses os ON o.status_id = os.status_id
                LEFT JOIN order_items oi ON o.order_id = oi.order_id
                GROUP BY o.order_id, c.first_name, c.last_name, o.order_date, os.status_name
                ORDER BY o.order_id DESC
                LIMIT 5
            `).then(([rows]) => rows),
            pool.query(`
                SELECT 
                    st.service_name,
                    COUNT(oi.order_item_id) AS orders_count,
                    COALESCE(SUM(oi.weight_kg), 0) AS total_kg_washed,
                    COALESCE(SUM(oi.subtotal), 0) AS total_revenue
                FROM service_types st
                LEFT JOIN order_items oi ON st.service_id = oi.service_id
                GROUP BY st.service_id, st.service_name
                ORDER BY total_revenue DESC
            `).then(([rows]) => rows)
        ]);

        res.json({
            counts: {
                customers: customerCount[0]?.total || 0,
                orders: orderCount[0]?.total || 0,
                completed: completedCount[0]?.total || 0,
                in_magma: magmaCount[0]?.total || 0,
                revenue: Number(revenueSum[0]?.total || 0),
                deliveries: deliveryCount[0]?.total || 0
            },
            latest_orders: latestOrders,
            service_breakdown: serviceBreakdown
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
