USE laundry_shop_db;

-- Insert sample customers
INSERT INTO customers (first_name, last_name, phone, street_address, barangay) VALUES
('Lisa',   'Delos Santos', '09171234501', '12 Rizal Street',       'Poblacion I'),
('Cedric', 'Garcia',       '09171234502', '45 Mabini Avenue',      'Mamatid'),
('Martin', 'Rivera',       '09171234503', '8 Bonifacio Boulevard', 'Pulo'),
('Janine', 'Gonzales',     '09171234504', '23 Luna Street',        'Banay-banay'),
('Eugene', 'Reyes',        '09171234505', '67 Del Pilar Street',   'Sala');

-- Insert sample staff (Password: admin123)
INSERT INTO staff (first_name, last_name, role, email, password, phone) VALUES
('Maria', 'Santos',    'Cashier', 'maria.santos@laba.ph',   '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112201'),
('Jose',  'Dela Cruz', 'Washer',  'jose.delacruz@laba.ph', '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112202'),
('Ana',   'Lopez',     'Folder',  'ana.lopez@laba.ph',     '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112203'),
('Pedro', 'Ramos',     'Rider',   'pedro.ramos@laba.ph',   '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112204'),
('Rosa',  'Mendoza',   'Manager', 'rosa.mendoza@laba.ph',  '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112205');


-- Insert sample service types
INSERT INTO service_types (service_name, price_per_kg) VALUES
('Wash and Fold',  45.00),
('Wash and Dry',   55.00),
('Dry Cleaning',   120.00),
('Ironing Only',   35.00),
('Comforter Wash', 150.00);

-- Insert sample order statuses
INSERT INTO order_statuses (status_name) VALUES
('Received'),
('Washing'),
('Ready for Pickup'),
('Out for Delivery'),
('Completed');

-- Insert sample orders
INSERT INTO orders (customer_id, staff_id, status_id, order_date, release_type, release_date) VALUES
(1, 1, 5, '2026-10-01', 'Pickup',   '2026-10-03'),
(2, 1, 5, '2026-10-02', 'Delivery', '2026-10-04'),
(3, 5, 3, '2026-10-05', 'Pickup',   NULL),
(4, 1, 4, '2026-10-06', 'Delivery', NULL),
(5, 1, 2, '2026-10-07', 'Pickup',   NULL);

-- Insert sample order items
INSERT INTO order_items (order_id, service_id, weight_kg, subtotal) VALUES
(1, 1, 4.00, 180.00),
(1, 4, 2.00,  70.00),
(2, 2, 5.00, 275.00),
(3, 3, 2.00, 240.00),
(3, 1, 3.00, 135.00),
(4, 5, 1.50, 225.00),
(5, 1, 6.00, 270.00),
(5, 4, 1.00,  35.00);

-- Insert sample payments
INSERT INTO payments (order_id, amount_paid, payment_method, payment_date) VALUES
(1, 250.00, 'Cash',  '2026-10-03'),
(2, 275.00, 'GCash', '2026-10-04'),
(3, 100.00, 'Cash',  '2026-10-05'),
(4, 225.00, 'GCash', '2026-10-06'),
(5, 150.00, 'Cash',  '2026-10-07');
