USE laundry_shop_db;

-- Insert
INSERT INTO customers (first_name, last_name, phone, address) 
VALUES ('Sarah', 'Jenkins', '09171234506', '99 Main St., Cabuyao, Laguna');

-- Select with WHERE
SELECT customer_id, first_name, last_name, phone, address 
FROM customers 
WHERE address LIKE '%Cabuyao%';

-- Update
UPDATE customers 
SET phone = '09179999999' 
WHERE customer_id = 1;

-- Delete
DELETE FROM payments 
WHERE payment_id = 5;

-- Advanced Query (JOIN, WHERE, GROUP BY, ORDER BY)
SELECT 
    c.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    COUNT(DISTINCT o.order_id) AS total_delivery_orders,
    SUM(p.amount_paid) AS total_amount_paid
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
JOIN payments p ON o.order_id = p.order_id
WHERE o.release_type = 'Delivery'
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_amount_paid DESC;

-- Order Summary
SELECT 
    o.order_id,
    o.order_date,
    o.release_type,
    o.release_date,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.phone AS customer_phone,
    CONCAT(s.first_name, ' ', s.last_name) AS staff_name,
    os.status_name AS order_status,
    COALESCE(SUM(oi.subtotal), 0) AS total_amount,
    COALESCE(pay.total_paid, 0) AS total_paid,
    CASE 
        WHEN COALESCE(pay.total_paid, 0) >= COALESCE(SUM(oi.subtotal), 0) AND COALESCE(SUM(oi.subtotal), 0) > 0 THEN 'Paid'
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
    GROUP BY order_id
) pay ON o.order_id = pay.order_id
GROUP BY o.order_id, o.order_date, o.release_type, o.release_date, c.first_name, c.last_name, c.phone, s.first_name, s.last_name, os.status_name, pay.total_paid
ORDER BY o.order_id DESC;

-- Revenue by Service Type
SELECT 
    st.service_name,
    COUNT(oi.order_item_id) AS orders_count,
    SUM(oi.weight_kg) AS total_kg_washed,
    SUM(oi.subtotal) AS total_revenue
FROM service_types st
LEFT JOIN order_items oi ON st.service_id = oi.service_id
GROUP BY st.service_id, st.service_name
ORDER BY total_revenue DESC;
