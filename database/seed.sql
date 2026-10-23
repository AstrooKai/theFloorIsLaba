-- Project: TheFloorIsLaba - Laundromat Management System
-- Initial seed dataset for testing staff roles, customers, pricing, and orders

USE laundry_shop_db;

-- 1. Seed customers
INSERT INTO customers (first_name, last_name, phone, street_address, barangay, status, is_archived) VALUES
('Lisa',   'Delos Santos', '09171234501', '12 Rizal Street',       'Poblacion I', 'Active', FALSE),
('Cedric', 'Garcia',       '09171234502', '45 Mabini Avenue',      'Mamatid',     'Active', FALSE),
('Martin', 'Rivera',       '09171234503', '8 Bonifacio Boulevard', 'Pulo',        'Active', FALSE),
('Janine', 'Gonzales',     '09171234504', '23 Luna Street',        'Banay-banay', 'Active', FALSE),
('Eugene', 'Reyes',        '09171234505', '67 Del Pilar Street',   'Sala',        'Active', FALSE);

-- 2. Seed staff (Default password: admin123)
INSERT INTO staff (first_name, last_name, role, email, password, phone, status, is_archived) VALUES
('Maria', 'Santos',    'Cashier', 'maria.santos@laba.ph',   '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112201', 'Active', FALSE),
('Jose',  'Dela Cruz', 'Washer',  'jose.delacruz@laba.ph', '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112202', 'Active', FALSE),
('Ana',   'Lopez',     'Folder',  'ana.lopez@laba.ph',     '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112203', 'Active', FALSE),
('Pedro', 'Ramos',     'Rider',   'pedro.ramos@laba.ph',   '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112204', 'Active', FALSE),
('Rosa',  'Mendoza',   'Manager', 'rosa.mendoza@laba.ph',  '$2b$10$AYStZPBMESfGf2PwG0MHCeEmKflNO4FQ4XLBrh94h1/CEvoCxE5Ba', '09181112205', 'Active', FALSE);

-- 3. Seed service types
INSERT INTO service_types (service_name, price_per_kg, unit, category, turnaround_hours, status, description) VALUES
('Wash and Fold',          45.00,  'kg',    'Wash & fold',      24, 'Active', 'Standard machine washing, tumble drying, and neat folding for everyday apparel.'),
('Wash and Dry',           55.00,  'kg',    'Wash & dry',       24, 'Active', 'Complete wash and dry cycle without folding, ideal for bulk clothes.'),
('Dry Cleaning',           120.00, 'piece', 'Specialty care',   48, 'Active', 'Delicate solvent-based cleaning for formal suits, barongs, gowns, and silk.'),
('Ironing Only',           35.00,  'kg',    'Pressing',         12, 'Active', 'Professional steam pressing and wrinkle removal for collared shirts and uniforms.'),
('Comforter Wash',         150.00, 'piece', 'Bedding & bulky',  48, 'Active', 'Heavy-duty wash for thick duvets, comforters, and queen/king bedspreads.'),
('Comforter & Duvet Care', 160.00, 'piece', 'Dry cleaning',     48, 'Active', 'Professional dry cleaning for heavy duvets, wool blankets, and delicate quilts.');

-- 4. Seed order statuses
INSERT INTO order_statuses (status_id, status_name) VALUES
(1, 'Received'),
(2, 'Washing'),
(3, 'Ready for Pickup'),
(4, 'Out for Delivery'),
(5, 'Completed'),
(6, 'Folding');

-- 5. Seed orders
INSERT INTO orders (order_id, customer_id, staff_id, status_id, order_date, release_type, release_date, is_archived) VALUES
(1, 1, 1, 5, '2026-10-01', 'Pickup',   '2026-10-03', FALSE),
(2, 2, 1, 5, '2026-10-02', 'Delivery', '2026-10-04', FALSE),
(3, 3, 5, 3, '2026-10-05', 'Pickup',   NULL,         FALSE),
(4, 4, 1, 4, '2026-10-06', 'Delivery', NULL,         FALSE),
(5, 5, 1, 6, '2026-10-07', 'Pickup',   NULL,         FALSE),
(6, 1, 1, 2, '2026-10-08', 'Delivery', NULL,         FALSE);

-- 6. Seed order items
INSERT INTO order_items (order_id, service_id, weight_kg, subtotal) VALUES
(1, 1, 4.00, 180.00),
(1, 4, 2.00,  70.00),
(2, 2, 5.00, 275.00),
(3, 3, 2.00, 240.00),
(3, 1, 3.00, 135.00),
(4, 5, 1.50, 225.00),
(5, 1, 6.00, 270.00),
(5, 4, 1.00,  35.00),
(6, 2, 4.00, 220.00);

-- 7. Seed payments (Only full payments allowed)
INSERT INTO payments (order_id, amount_paid, payment_method, reference_no, payment_date, status, is_archived) VALUES
(1, 250.00, 'Cash',  NULL,          '2026-10-03', 'Paid', FALSE),
(2, 325.00, 'GCash', 'GCASH-98214', '2026-10-04', 'Paid', FALSE),
(4, 275.00, 'Maya',  'MAYA-44102',  '2026-10-06', 'Paid', FALSE);

-- 8. Seed deliveries
INSERT INTO deliveries (order_id, type, rider_id, scheduled_date, time_slot, fee, status, street, barangay, contact, notes, is_archived) VALUES
(1, 'Pickup',   NULL, '2026-10-01', '10 AM - 12 PM', 0.00,  'Completed', '12 Rizal Street',       'Poblacion I', '09171234501', 'Customer counter pickup completed.', FALSE),
(2, 'Delivery', 4,    '2026-10-02', '10 AM - 12 PM', 50.00, 'Completed', '45 Mabini Avenue',      'Mamatid',     '09171234502', 'Delivered and signed by resident.', FALSE),
(3, 'Pickup',   NULL, '2026-10-05', '10 AM - 12 PM', 0.00,  'Scheduled', '8 Bonifacio Boulevard', 'Pulo',        '09171234503', 'Customer scheduled morning counter pickup.', FALSE),
(4, 'Delivery', 4,    '2026-10-06', '10 AM - 12 PM', 50.00, 'On the way', '23 Luna Street',       'Banay-banay', '09171234504', 'Near Banay-banay Barangay Hall.', FALSE),
(5, 'Pickup',   NULL, '2026-10-07', '10 AM - 12 PM', 0.00,  'Scheduled', '67 Del Pilar Street',   'Sala',        '09171234505', 'Folding in progress at facility.', FALSE),
(6, 'Delivery', 4,    '2026-10-08', '1 - 3 PM',      50.00, 'Scheduled', '12 Rizal Street',       'Poblacion I', '09171234501', 'Scheduled delivery after wash cycle.', FALSE);
