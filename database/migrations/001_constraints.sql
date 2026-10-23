-- For databases created before the matching constraints in schema.sql:
-- 1. Run the preflight SELECTs and resolve every returned row.
-- 2. Run the ALTER TABLE statements once.
-- Do not execute the whole file as a single script.
SELECT status, COUNT(*) AS invalid_count
FROM customers
WHERE status IS NULL OR status NOT IN ('Active', 'Inactive')
GROUP BY status;

SELECT role, COUNT(*) AS invalid_count
FROM staff
WHERE role IS NULL OR role NOT IN ('Manager', 'Cashier', 'Washer', 'Folder', 'Rider')
GROUP BY role;

SELECT status_name, COUNT(*) AS duplicate_count
FROM order_statuses
GROUP BY status_name
HAVING COUNT(*) > 1;

SELECT payment_method, reference_no, COUNT(*) AS duplicate_count
FROM payments
WHERE reference_no IS NOT NULL
GROUP BY payment_method, reference_no
HAVING COUNT(*) > 1;

SELECT payment_id, amount_paid, payment_method, status
FROM payments
WHERE amount_paid <= 0
   OR payment_method NOT IN ('Cash', 'GCash', 'Maya', 'QRPh', 'Card')
   OR status IS NULL
   OR status NOT IN ('Paid', 'Pending', 'Refunded');

SELECT service_id, unit, status, price_per_kg, turnaround_hours
FROM service_types
WHERE price_per_kg <= 0
   OR turnaround_hours <= 0
   OR unit IS NULL
   OR unit NOT IN ('kg', 'piece')
   OR category IS NULL
   OR category NOT IN ('Wash & fold', 'Wash & dry', 'Pressing', 'Specialty care', 'Bedding & bulky', 'Dry cleaning')
   OR status IS NULL
   OR status NOT IN ('Active', 'Discontinued');

SELECT order_id, release_type
FROM orders
WHERE release_type NOT IN ('Pickup', 'Delivery');

SELECT order_item_id, weight_kg, subtotal
FROM order_items
WHERE weight_kg <= 0
   OR subtotal < 0;

SELECT delivery_id, type, fee, status
FROM deliveries
WHERE type NOT IN ('Pickup', 'Delivery')
   OR fee < 0
   OR status NOT IN ('Scheduled', 'On the way', 'Completed', 'Cancelled');

ALTER TABLE customers
    ADD CONSTRAINT chk_customers_status CHECK (status IS NOT NULL AND status IN ('Active', 'Inactive'));

ALTER TABLE staff
    ADD CONSTRAINT chk_staff_role CHECK (role IN ('Manager', 'Cashier', 'Washer', 'Folder', 'Rider'));

ALTER TABLE order_statuses
    ADD CONSTRAINT uq_order_status_name UNIQUE (status_name);

ALTER TABLE payments
    ADD CONSTRAINT uq_payment_method_reference UNIQUE (payment_method, reference_no),
    ADD CONSTRAINT chk_payment_amount CHECK (amount_paid > 0),
    ADD CONSTRAINT chk_payment_method CHECK (payment_method IN ('Cash', 'GCash', 'Maya', 'QRPh', 'Card')),
    ADD CONSTRAINT chk_payment_status CHECK (status IS NOT NULL AND status IN ('Paid', 'Pending', 'Refunded'));

ALTER TABLE order_items
    ADD CONSTRAINT chk_order_item_weight CHECK (weight_kg > 0),
    ADD CONSTRAINT chk_order_item_subtotal CHECK (subtotal >= 0);

ALTER TABLE deliveries
    ADD CONSTRAINT chk_delivery_type CHECK (type IN ('Pickup', 'Delivery')),
    ADD CONSTRAINT chk_delivery_fee CHECK (fee >= 0),
    ADD CONSTRAINT chk_delivery_status CHECK (status IN ('Scheduled', 'On the way', 'Completed', 'Cancelled'));

ALTER TABLE orders
    ADD CONSTRAINT chk_order_release_type CHECK (release_type IN ('Pickup', 'Delivery'));

ALTER TABLE service_types
    ADD CONSTRAINT chk_service_price CHECK (price_per_kg > 0),
    ADD CONSTRAINT chk_service_turnaround CHECK (turnaround_hours > 0),
    ADD CONSTRAINT chk_service_unit CHECK (unit IS NOT NULL AND unit IN ('kg', 'piece')),
    ADD CONSTRAINT chk_service_status CHECK (status IS NOT NULL AND status IN ('Active', 'Discontinued')),
    ADD CONSTRAINT chk_service_category CHECK (category IS NOT NULL AND category IN ('Wash & fold', 'Wash & dry', 'Pressing', 'Specialty care', 'Bedding & bulky', 'Dry cleaning'));
