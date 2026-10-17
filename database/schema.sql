-- Database schema
CREATE DATABASE IF NOT EXISTS laundry_shop_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE laundry_shop_db;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(50)  NOT NULL,
    last_name   VARCHAR(50)  NOT NULL,
    phone       VARCHAR(15)  NOT NULL,
    street      VARCHAR(100) NULL,
    barangay    VARCHAR(50)  NULL,
    address     VARCHAR(150) NOT NULL,
    status      VARCHAR(20)  DEFAULT 'Active',
    is_archived BOOLEAN      DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
    staff_id   INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50)  NOT NULL,
    last_name  VARCHAR(50)  NOT NULL,
    role       VARCHAR(30)  NOT NULL,
    email      VARCHAR(100) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    phone      VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Service types table
CREATE TABLE IF NOT EXISTS service_types (
    service_id       INT AUTO_INCREMENT PRIMARY KEY,
    service_name     VARCHAR(50)   NOT NULL,
    price_per_kg     DECIMAL(8,2)  NOT NULL,
    unit             VARCHAR(20)   DEFAULT 'kg',
    category         VARCHAR(50)   DEFAULT 'Wash & fold',
    turnaround_hours INT           DEFAULT 24,
    status           ENUM('Active', 'Inactive') DEFAULT 'Active',
    description      VARCHAR(255)  NULL
);

-- Order statuses table
CREATE TABLE IF NOT EXISTS order_statuses (
    status_id   INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(30) NOT NULL
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    order_id     INT AUTO_INCREMENT PRIMARY KEY,
    customer_id  INT NOT NULL,
    staff_id     INT NOT NULL,
    status_id    INT NOT NULL,
    order_date   DATE NOT NULL,
    release_type VARCHAR(10) NOT NULL,
    release_date DATE NULL,
    is_archived  BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_orders_staff FOREIGN KEY (staff_id) 
        REFERENCES staff(staff_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_orders_status FOREIGN KEY (status_id) 
        REFERENCES order_statuses(status_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT NOT NULL,
    service_id    INT NOT NULL,
    weight_kg     DECIMAL(5,2)  NOT NULL,
    subtotal      DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_service FOREIGN KEY (service_id) 
        REFERENCES service_types(service_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    payment_id     INT AUTO_INCREMENT PRIMARY KEY,
    order_id       INT NOT NULL,
    amount_paid    DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    reference_no   VARCHAR(100) NULL,
    payment_date   DATE NOT NULL,
    status         VARCHAR(20) DEFAULT 'Paid',
    is_archived    BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Deliveries table (Decoupled transport runs)
CREATE TABLE IF NOT EXISTS deliveries (
    delivery_id    INT AUTO_INCREMENT PRIMARY KEY,
    order_id       INT NOT NULL,
    type           VARCHAR(20) NOT NULL DEFAULT 'Delivery',
    rider_id       INT NULL,
    scheduled_date DATE NOT NULL,
    time_slot      VARCHAR(50) NOT NULL DEFAULT '10 AM - 12 PM',
    fee            DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    status         VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    street         VARCHAR(100) NULL,
    barangay       VARCHAR(50) NULL,
    address        VARCHAR(150) NOT NULL,
    contact        VARCHAR(20) NOT NULL,
    notes          TEXT NULL,
    is_archived    BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deliveries_order FOREIGN KEY (order_id)
        REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_deliveries_rider FOREIGN KEY (rider_id)
        REFERENCES staff(staff_id) ON DELETE SET NULL ON UPDATE CASCADE
);

