-- Database schema
CREATE DATABASE IF NOT EXISTS laundry_shop_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE laundry_shop_db;

-- Drop tables in order of dependencies to avoid foreign key constraints
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_statuses;
DROP TABLE IF EXISTS service_types;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS customers;

-- Customers table
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(50)  NOT NULL,
    last_name   VARCHAR(50)  NOT NULL,
    phone       VARCHAR(15)  NOT NULL,
    address     VARCHAR(150) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff table
CREATE TABLE staff (
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
CREATE TABLE service_types (
    service_id   INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(50)  NOT NULL,
    price_per_kg DECIMAL(8,2) NOT NULL
);

-- Order statuses table
CREATE TABLE order_statuses (
    status_id   INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(30) NOT NULL
);

-- Orders table
CREATE TABLE orders (
    order_id     INT AUTO_INCREMENT PRIMARY KEY,
    customer_id  INT NOT NULL,
    staff_id     INT NOT NULL,
    status_id    INT NOT NULL,
    order_date   DATE NOT NULL,
    release_type VARCHAR(10) NOT NULL,
    release_date DATE NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_orders_staff FOREIGN KEY (staff_id) 
        REFERENCES staff(staff_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_orders_status FOREIGN KEY (status_id) 
        REFERENCES order_statuses(status_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Order items table
CREATE TABLE order_items (
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
CREATE TABLE payments (
    payment_id     INT AUTO_INCREMENT PRIMARY KEY,
    order_id       INT NOT NULL,
    amount_paid    DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_date   DATE NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE
);
