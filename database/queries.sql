-- Project: TheFloorIsLaba - Laundromat Management System
-- Essential SQL Queries (CRUD, Relational JOINs, Aggregations, Grouping, and Reporting)

USE laundry_shop_db;

-- Part 1: Basic CRUD Operations

-- 1.1 CREATE (INSERT): Register a new walk-in customer
INSERT INTO customers (first_name, last_name, phone, street_address, barangay) 
VALUES ('Sarah', 'Jenkins', '09171234506', '99 Main St.', 'Poblacion I');

-- 1.2 READ (SELECT with WHERE): Filter customers by street address keyword
SELECT 
    customer_id, 
    first_name, 
    last_name, 
    phone, 
    street_address, 
    barangay 
FROM customers 
WHERE street_address LIKE '%Main%'
  AND (is_archived IS NULL OR is_archived = FALSE);

-- 1.3 UPDATE: Modify contact number for an existing customer
UPDATE customers 
SET phone = '09179999999' 
WHERE customer_id = 1;

-- 1.4 DELETE: Remove a payment entry by primary key
DELETE FROM payments 
WHERE payment_id = 5;

-- Part 2: Multi-Table Relational JOINs

-- 2.1 Customer Delivery Revenue: Inner join across customers, orders, and payments
SELECT 
    c.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    COUNT(DISTINCT o.order_id) AS total_delivery_orders,
    SUM(p.amount_paid) AS total_amount_paid
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
INNER JOIN payments p ON o.order_id = p.order_id
WHERE o.release_type = 'Delivery'
GROUP BY c.customer_id, c.first_name, c.last_name
ORDER BY total_amount_paid DESC;

-- Part 3: Aggregations and Grouping

-- 3.1 Revenue and Volume Breakdown by Service Type
SELECT 
    st.service_id,
    st.service_name,
    COUNT(oi.order_item_id) AS orders_count,
    COALESCE(SUM(oi.weight_kg), 0.00) AS total_kg_washed,
    COALESCE(SUM(oi.subtotal), 0.00) AS total_revenue
FROM service_types st
LEFT JOIN order_items oi ON st.service_id = oi.service_id
GROUP BY st.service_id, st.service_name
ORDER BY total_revenue DESC;

-- Part 4: Advanced Business Intelligence and Reporting

-- 4.1 Master Order Summary Report with dynamic payment status
SELECT 
    o.order_id,
    o.order_date,
    o.release_type,
    o.release_date,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.phone AS customer_phone,
    CONCAT(s.first_name, ' ', s.last_name) AS staff_name,
    os.status_name AS order_status,
    COALESCE(SUM(oi.subtotal), 0.00) AS total_amount,
    COALESCE(pay.total_paid, 0.00) AS total_paid,
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
INNER JOIN customers c ON o.customer_id = c.customer_id
INNER JOIN staff s ON o.staff_id = s.staff_id
INNER JOIN order_statuses os ON o.status_id = os.status_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN (
    -- Subquery calculating the total verified amount paid per order
    SELECT 
        order_id, 
        SUM(amount_paid) AS total_paid 
    FROM payments 
    WHERE (is_archived IS NULL OR is_archived = FALSE)
      AND (status IS NULL OR status = 'Paid')
    GROUP BY order_id
) pay ON o.order_id = pay.order_id
GROUP BY 
    o.order_id, 
    o.order_date, 
    o.release_type, 
    o.release_date, 
    c.first_name, 
    c.last_name, 
    c.phone, 
    s.first_name, 
    s.last_name, 
    os.status_name, 
    pay.total_paid
ORDER BY o.order_id DESC;

-- Part 5: Operational and Logistics Queries

-- 5.1 Active Pickup & Delivery Dispatch Schedule
SELECT 
    d.delivery_id,
    d.order_id,
    d.type AS transport_type,
    d.scheduled_date,
    d.time_slot,
    d.fee,
    d.status AS run_status,
    d.street,
    d.barangay,
    CONCAT_WS(', ', d.street, d.barangay) AS full_destination,
    d.contact,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    CONCAT(r.first_name, ' ', r.last_name) AS rider_name
FROM deliveries d
INNER JOIN orders o ON d.order_id = o.order_id
INNER JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN staff r ON d.rider_id = r.staff_id
WHERE (d.is_archived IS NULL OR d.is_archived = FALSE)
ORDER BY d.scheduled_date DESC, d.delivery_id DESC;
