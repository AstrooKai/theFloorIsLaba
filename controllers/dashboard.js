const pool = require('../config/db');

// Controller for dashboard overview metrics and analytics
exports.getDashboardSummary = async (req, res) => {
    try {
        // Run database aggregation queries concurrently to optimize dashboard loading
        const [
            customerRows,
            orderRows,
            completedRows,
            inProgressRows,
            revenueRows,
            deliveryRows,
            latestOrderRows,
            serviceBreakdownRows
        ] = await Promise.all([
            // 1. Total customer count
            pool.query('SELECT COUNT(*) AS total FROM customers'),

            // 2. Total active orders count
            pool.query('SELECT COUNT(*) AS total FROM orders WHERE (is_archived IS NULL OR is_archived = FALSE)'),

            // 3. Completed orders count
            pool.query(`
                SELECT COUNT(*) AS total 
                FROM orders o 
                JOIN order_statuses os ON o.status_id = os.status_id 
                WHERE os.status_name = 'Completed' 
                  AND (o.is_archived IS NULL OR o.is_archived = FALSE)
            `),

            // 4. In-progress orders count
            pool.query(`
                SELECT COUNT(*) AS total 
                FROM orders o 
                JOIN order_statuses os ON o.status_id = os.status_id 
                WHERE os.status_name != 'Completed' 
                  AND (o.is_archived IS NULL OR o.is_archived = FALSE)
            `),

            // 5. Total revenue accumulated from payments
            pool.query('SELECT COALESCE(SUM(amount_paid), 0) AS total FROM payments'),

            // 6. Delivery-type orders count
            pool.query("SELECT COUNT(*) AS total FROM orders WHERE release_type = 'Delivery' AND (is_archived IS NULL OR is_archived = FALSE)"),

            // 7. Recent 5 orders for dashboard feed
            pool.query(`
                SELECT 
                    o.order_id,
                    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                    DATE_FORMAT(o.order_date, '%b %d, %Y') AS formatted_date,
                    o.order_date,
                    o.release_type,
                    os.status_name AS order_status,
                    COALESCE(SUM(oi.subtotal), 0) AS total
                FROM orders o
                JOIN customers c ON o.customer_id = c.customer_id
                JOIN order_statuses os ON o.status_id = os.status_id
                LEFT JOIN order_items oi ON o.order_id = oi.order_id
                WHERE (o.is_archived IS NULL OR o.is_archived = FALSE)
                GROUP BY o.order_id, c.first_name, c.last_name, o.order_date, o.release_type, os.status_name
                ORDER BY o.order_id DESC
                LIMIT 5
            `),

            // 8. Service type usage and revenue breakdown
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
            `)
        ]);

        // Extract query results from the MySQL result arrays [rows, fields]
        const totalCustomers = customerRows[0][0]?.total || 0;
        const totalOrders = orderRows[0][0]?.total || 0;
        const totalCompleted = completedRows[0][0]?.total || 0;
        const totalInProgress = inProgressRows[0][0]?.total || 0;
        const totalRevenue = Number(revenueRows[0][0]?.total || 0);
        const totalDeliveries = deliveryRows[0][0]?.total || 0;
        const recentOrders = latestOrderRows[0] || [];
        const serviceBreakdown = serviceBreakdownRows[0] || [];

        // Return structured dashboard payload
        res.json({
            counts: {
                customers: totalCustomers,
                orders: totalOrders,
                completed: totalCompleted,
                in_progress: totalInProgress,
                revenue: totalRevenue,
                deliveries: totalDeliveries
            },
            latest_orders: recentOrders,
            service_breakdown: serviceBreakdown
        });
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: error.message });
    }
};

