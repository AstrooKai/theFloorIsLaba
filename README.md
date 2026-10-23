# The Floor is Laba
### Laundry Shop Order Tracking & Management System

---

## Table of Contents
1. [System Overview](#1-system-overview)
   - [Problem Statement](#problem-statement)
   - [Proposed Solution](#proposed-solution)
   - [Target Users & Role Hierarchy](#target-users--role-hierarchy)
   - [Core System Objectives](#core-system-objectives)
   - [Non-Functional Requirements & Security](#non-functional-requirements--security)
2. [Technology Stack & Architecture](#2-technology-stack--architecture)
3. [Database Walkthrough & Normalization](#3-database-walkthrough--normalization)
   - [Database Schema (8 Relational Tables)](#database-schema-8-relational-tables)
   - [Normalization Rationale (1NF to 3NF)](#normalization-rationale-1nf-to-3nf)
   - [Table Relationships & Cardinalities](#table-relationships--cardinalities)
   - [Constraints & Referential Integrity Rules](#constraints--referential-integrity-rules)
4. [System Features & Modules](#4-system-features--modules)
   - [1. Authentication & RBAC Guard](#1-authentication--rbac-guard)
   - [2. Customer Management](#2-customer-management)
   - [3. Order Intake & Multi-Item Calculation](#3-order-intake--multi-item-calculation)
   - [4. Operational Order Lifecycle Progression](#4-operational-order-lifecycle-progression)
   - [5. Service Catalog & Rates](#5-service-catalog--rates)
   - [6. Payment Settlement & Billing](#6-payment-settlement--billing)
   - [7. Pickup & Delivery Transport Logistics](#7-pickup--delivery-transport-logistics)
   - [8. Staff Management & Sole-Manager Safeguards](#8-staff-management--sole-manager-safeguards)
   - [9. Soft Archiving & Restoration Audit Hub](#9-soft-archiving--restoration-audit-hub)
   - [10. Executive Dashboard & Real-Time Analytics](#10-executive-dashboard--real-time-analytics)
5. [End-to-End System Flows (UI -> API -> DB -> UI)](#5-end-to-end-system-flows-ui--api--db--ui)
   - [Flow A: Creating a New Laundry Order](#flow-a-creating-a-new-laundry-order)
   - [Flow B: Advancing Laundry Order Progression](#flow-b-advancing-laundry-order-progression)
   - [Flow C: Recording Full Payment](#flow-c-recording-full-payment)
   - [Flow D: Dispatching & Completing a Delivery Run](#flow-d-dispatching--completing-a-delivery-run)
   - [Flow E: Soft Archiving & Restoring a Record](#flow-e-soft-archiving--restoring-a-record)
6. [Defense Preparation & Panel Reviewer Q&A](#6-defense-preparation--panel-reviewer-qa)
7. [Installation & Local Setup](#7-installation--local-setup)

---

## 1. System Overview

### Problem Statement
Many small-to-medium laundry establishments in the Philippines still manage operational records manually through paper logbooks, handwritten job-order slips, loose cash receipts, and chat messaging. This manual paradigm creates operational bottlenecks:
* **Record Degradation & Loss**: Physical paper slips fade, get damaged by water/detergents, or get misplaced.
* **Calculation Errors**: Counter clerks manually compute variable weight totals, discounts, and delivery fees, resulting in revenue leakage or customer billing disputes.
* **Opaque Tracking**: Staff cannot immediately provide real-time updates when customers inquire if their garments are currently being washed, folded, or ready for pickup.
* **Payment Misalignment**: Difficulties tracking which orders have been settled, which remain unpaid, or how non-cash digital payments (GCash, Maya, QRPh) match specific invoices.
* **Logistics Disconnect**: Delivery riders have no structured route manifest, leading to missed time slots, unassigned runs, and delivery delays.

### Proposed Solution
**The Floor is Laba** is a centralized, database-driven Laundry Shop Order Tracking and Management System. It replaces physical ledgers with a robust relational database (3NF) paired with an intuitive, responsive web portal. It tracks laundry workflows from garment intake, washing, and folding, through delivery dispatch and full financial reconciliation.

### Target Users & Role Hierarchy
The system enforces strict Role-Based Access Control (RBAC):

| Role | Access Level | Primary Responsibilities |
| :--- | :---: | :--- |
| **Manager (Admin)** | **Full System Access** | Staff administration, service catalog pricing, operational overrides, financial reports, viewing and restoring soft-archived records. |
| **Cashier** | **Operational Access** | Customer registration, order intake, payment processing, invoice generation, status advancing, scheduling runs. |
| **Washer / Folder** | **Production Workspace** | Login access to assigned order queues and progression through the ready stage only. |
| **Rider** | **Delivery Workspace** | Login access to pickup and delivery run operations without payment or staff administration. |

### Core System Objectives
1. **Centralize Data**: Replace fragmented paper notebooks with an ACID-compliant MySQL relational database.
2. **End-to-End Tracking**: Track order status through an updated 6-stage lifecycle (`Received` -> `Washing` -> `Folding` -> `Ready for Pickup` / `Out for Delivery` -> `Completed`).
3. **Automate Pricing**: The server calculates order totals from active catalog rates (per kg or per piece); delivery fees are added separately to billable totals.
4. **Enforce Financial Integrity**: Require exact-balance payments, include active delivery fees, reject overpayments, and require full payment before an order can be completed or archived.
5. **Preserve Audit Trails**: Implement soft-delete archiving (`is_archived = TRUE`) so historical metrics and order histories remain preserved even when entities are retired.

### Non-Functional Requirements & Security
* **Data Integrity**: Parameterized SQL queries prevent SQL Injection (SQLi).
* **Authentication & Authorization**: Staff sign-in issues a signed JWT; protected API routes use the token's verified staff ID and role. Role workspaces limit operations on the server, not only in navigation.
* **Password Security**: Staff credentials are stored using adaptive one-way `bcryptjs` hashing (10 salt rounds).
* **Request Boundaries**: Login attempts are rate-limited, CORS is restricted to configured trusted origins, and cloud database TLS certificate verification is enabled by default.
* **Referential Integrity**: Cascading rules (`ON DELETE CASCADE`, `ON DELETE SET NULL`, `ON DELETE RESTRICT`) prevent orphaned database rows.
* **Concurrency & Validation**: Both frontend (real-time input constraints) and backend controllers perform dual-layer payload validation.
* **Localization**: Tailored specifically for Philippine laundromat operations, featuring Philippine Peso (`₱`) formatting, 11-digit mobile validation (`09XXXXXXXXX`), and Cabuyao, Laguna barangay integration.

---

## 2. Technology Stack & Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT / BROWSER                       │
│  HTML5 + Vanilla CSS (Custom Design System) + Vanilla JS   │
│  Modular Entity Architecture (ENT) + State Store (appState) │
└──────────────────────────────▲──────────────────────────────┘
                               │ HTTP / JSON REST APIs
                               │ (x-staff-role / Auth Headers)
┌──────────────────────────────▼──────────────────────────────┐
│                    NODE.JS / EXPRESS 5                      │
│  server.js (Express Middleware, Static Server, API Router)  │
│  ├── /middleware/auth.js (RBAC & Role Verification)         │
│  └── /controllers/*.js (Business Logic & Input Validation)  │
└──────────────────────────────▲──────────────────────────────┘
                               │ mysql2/promise Connection Pool
                               │ Parameterized Prepared Statements
┌──────────────────────────────▼──────────────────────────────┐
│                      MYSQL DATABASE                         │
│  laundry_shop_db (8 Normalized Tables in 3NF)               │
└─────────────────────────────────────────────────────────────┘
```

* **Runtime & Server**: Node.js, Express 5
* **Database Driver**: `mysql2/promise` (connection pooling, UTF-8 collation, multipleStatements support)
* **Authentication**: Token / Session Role Extraction via `middleware/auth.js`, `bcryptjs`
* **Frontend**: Vanilla ES6+ JavaScript (zero heavy framework overhead), Vanilla CSS Custom Properties (magma brand tokens, dark/light themes), Bootstrap 5 Modal & Tooltip components, Bootstrap Icons (`bi-*`).

---

## 3. Database Walkthrough & Normalization

The database `laundry_shop_db` comprises **8 relational tables** structured in **Third Normal Form (3NF)** to eliminate redundancy and prevent insert, update, and delete anomalies.

```
                  ┌───────────────┐
                  │   CUSTOMERS   │
                  └───┬───────────┘
                      │ 1
                      │ places
                      │ N
┌───────────────┐ 1   │ N ┌───────────────┐ 1       N ┌───────────────┐
│ORDER_STATUSES ├─────┼───┤    ORDERS     ├───────────┤  ORDER_ITEMS  │
└───────────────┘     │   └───┬───────┬───┘           └───▲───────────┘
                      │       │ 1     │ 1                 │ N
                      │       │ paid  │ released          │ uses
                      │       │ by    │ via               │ 1
                      │ 1     │ N     │ N             ┌───┴───────────┐
┌───────────────┐ 1   │ N     │   ┌───▼───────────┐   │ SERVICE_TYPES │
│     STAFF     ├─────┴───────┼───┤  DELIVERIES   │   └───────────────┘
└───┬───────────┘ handles     │   └───────────────┘
    │ 1                       │ 1
    │ delivers (rider)        │ records
    │ N                       │ N
    └─────────────────────────┼───┐
                              ▼   │
                        ┌─────────┴─────┐
                        │   PAYMENTS    │
                        └───────────────┘
```

### Database Schema (8 Relational Tables)

#### 1. `customers`
Stores registered customer profiles and localized address data.
* `customer_id` (INT, PK, Auto Increment): Unique customer identifier.
* `first_name` (VARCHAR(50), NOT NULL): Customer first name.
* `last_name` (VARCHAR(50), NOT NULL): Customer last name / surname.
* `phone` (VARCHAR(15), NOT NULL): 11-digit mobile contact number (`09XXXXXXXXX`).
* `street_address` (VARCHAR(150), NOT NULL): House number, building, street, or subdivision.
* `barangay` (VARCHAR(50), NULL): City of Cabuyao barangay jurisdiction.
* `status` (VARCHAR(20), DEFAULT 'Active'): Customer lifecycle status (`Active`, `Inactive`).
* `is_archived` (BOOLEAN, DEFAULT FALSE): Soft-deletion flag.
* `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP): Registration timestamp.

#### 2. `staff`
Stores employee profiles, administrative roles, and secure hashed credentials.
* `staff_id` (INT, PK, Auto Increment): Unique employee identifier.
* `first_name` (VARCHAR(50), NOT NULL)
* `last_name` (VARCHAR(50), NOT NULL)
* `role` (VARCHAR(30), NOT NULL): Assigned role (`Manager`, `Cashier`, `Washer`, `Folder`, `Rider`).
* `email` (VARCHAR(100), NOT NULL, UNIQUE): Unique login credential.
* `password` (VARCHAR(255), NOT NULL): `bcryptjs` 60-character salted hash.
* `phone` (VARCHAR(15), NULL): Staff contact number.
* `status` (VARCHAR(20), DEFAULT 'Active'): Account status (`Active`, `Deactivated`).
* `is_archived` (BOOLEAN, DEFAULT FALSE): Soft-deletion flag.
* `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

#### 3. `order_statuses`
Lookup table defining allowable order lifecycle stages.
* `status_id` (INT, PK, Auto Increment): Unique status identifier.
* `status_name` (VARCHAR(30), NOT NULL): Status name:
  1. `Received` — Intake complete, awaiting processing.
  2. `Washing` — Currently inside commercial washing/drying drum.
  3. `Ready for Pickup` — Washed, dried, and folded; awaiting customer counter claim.
  4. `Out for Delivery` — Dispatched with assigned rider en route.
  5. `Completed` — Garments successfully claimed or delivered.
  6. `Folding` — Post-wash folding, sorting, and packaging stage.

#### 4. `service_types`
Maintains laundry catalog offerings and rate parameters.
* `service_id` (INT, PK, Auto Increment): Unique service identifier.
* `service_name` (VARCHAR(50), NOT NULL): Display title (e.g. "Wash and Fold").
* `price_per_kg` (DECIMAL(8,2), NOT NULL): Unit pricing rate in PHP.
* `unit` (VARCHAR(20), DEFAULT 'kg'): Billing basis (`kg` for bulk wash; `piece` for dry cleaning/bedding).
* `category` (VARCHAR(50), DEFAULT 'Wash & fold'): Service group (`Wash & fold`, `Wash & dry`, `Pressing`, `Specialty care`, `Bedding & bulky`, `Dry cleaning`).
* `turnaround_hours` (INT, DEFAULT 24): Target completion duration.
* `status` (VARCHAR(20), DEFAULT 'Active'): Availability state (`Active`, `Discontinued`).
* `description` (VARCHAR(255), NULL): Explanatory customer details.

#### 5. `orders`
The central transaction table connecting customer, processing staff, and workflow status.
* `order_id` (INT, PK, Auto Increment): Unique order reference (`ORD-XXXX`).
* `customer_id` (INT, NOT NULL, FK -> `customers.customer_id`): Linked customer.
* `staff_id` (INT, NOT NULL, FK -> `staff.staff_id`): Clerk who encoded/processed the order.
* `status_id` (INT, NOT NULL, FK -> `order_statuses.status_id`): Current operational state.
* `order_date` (DATE, NOT NULL): Date of order placement.
* `release_type` (VARCHAR(10), NOT NULL): Fulfillment channel (`Pickup` or `Delivery`).
* `release_date` (DATE, NULL): Actual date garments were released/delivered.
* `is_archived` (BOOLEAN, DEFAULT FALSE): Soft-deletion flag.
* `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

#### 6. `order_items`
Junction table resolving the many-to-many relationship between `orders` and `service_types`.
* `order_item_id` (INT, PK, Auto Increment): Unique line item identifier.
* `order_id` (INT, NOT NULL, FK -> `orders.order_id`): Parent order.
* `service_id` (INT, NOT NULL, FK -> `service_types.service_id`): Selected service.
* `weight_kg` (DECIMAL(5,2), NOT NULL): Quantity (kilograms or piece count).
* `subtotal` (DECIMAL(10,2), NOT NULL): Precomputed line total (`weight_kg * rate`).

#### 7. `payments`
Maintains financial settlement records, method instruments, and digital audit references.
* `payment_id` (INT, PK, Auto Increment): Unique financial transaction ID (`PAY-XXXX`).
* `order_id` (INT, NOT NULL, FK -> `orders.order_id`): Linked order.
* `amount_paid` (DECIMAL(10,2), NOT NULL): Settlement amount in PHP.
* `payment_method` (VARCHAR(20), NOT NULL): Instrument (`Cash`, `GCash`, `Maya`, `QRPh`, `Card`).
* `reference_no` (VARCHAR(100), NULL): Digital transaction/approval code (required for non-cash).
* `payment_date` (DATE, NOT NULL): Date payment was acknowledged.
* `status` (VARCHAR(20), DEFAULT 'Paid'): Transaction state (`Paid`, `Pending`, `Refunded`).
* `is_archived` (BOOLEAN, DEFAULT FALSE): Soft-deletion flag.
* `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

#### 8. `deliveries`
Manages logistics dispatch, assigned riders, scheduled delivery windows, and fulfillment status.
* `delivery_id` (INT, PK, Auto Increment): Unique transport ticket identifier.
* `order_id` (INT, NOT NULL, FK -> `orders.order_id`): Associated order.
* `type` (VARCHAR(20), NOT NULL, DEFAULT 'Delivery'): Fulfillment type (`Pickup` or `Delivery`).
* `rider_id` (INT, NULL, FK -> `staff.staff_id`): Assigned delivery rider staff ID.
* `scheduled_date` (DATE, NOT NULL): Target dispatch/pickup date.
* `time_slot` (VARCHAR(50), NOT NULL): Operational window (e.g. `10 AM - 12 PM`).
* `fee` (DECIMAL(10,2), NOT NULL, DEFAULT 50.00): Logistics transport surcharge.
* `status` (VARCHAR(30), NOT NULL, DEFAULT 'Scheduled'): Run state (`Scheduled`, `On the way`, `Completed`, `Cancelled`).
* `street` (VARCHAR(150), NOT NULL): Destination street address.
* `barangay` (VARCHAR(50), NOT NULL): Destination barangay.
* `contact` (VARCHAR(20), NOT NULL): Contact number for courier handoff.
* `notes` (TEXT, NULL): Landmark or gate delivery instructions.
* `is_archived` (BOOLEAN, DEFAULT FALSE): Soft-deletion flag.
* `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

---

### Normalization Rationale (1NF to 3NF)

1. **First Normal Form (1NF)**:
   - All columns store atomic, indivisible values.
   - Repeating groups are eliminated: an order with 3 different laundry services does not store comma-separated values inside `orders`. Instead, each service is an independent atomic row inside `order_items`.
   - Each table possesses a designated Primary Key (`customer_id`, `order_id`, etc.).

2. **Second Normal Form (2NF)**:
   - Meets all 1NF criteria.
   - Eliminates partial dependencies: in the composite junction context of orders and services, line-item attributes like `subtotal` and `weight_kg` depend entirely on the primary key `order_item_id`. Service descriptions and base rates remain strictly in `service_types`.

3. **Third Normal Form (3NF)**:
   - Meets all 2NF criteria.
   - Eliminates transitive dependencies: non-key attributes depend *only* on the primary key.
   - Customer addresses are not duplicated inside `orders`; `orders` references `customer_id`.
   - Order status names are not hardcoded inside `orders`; `orders` references `status_id`.
   - Payments are isolated in `payments`, ensuring payment instrument references do not pollute order workflows.

---

### Table Relationships & Cardinalities

| Parent Table | Child Table | Cardinality | Foreign Key Column | Business Rule / Description |
| :--- | :--- | :---: | :--- | :--- |
| `customers` | `orders` | **1 : N** | `orders.customer_id` | One customer can place multiple laundry orders over time; each order belongs to one customer. |
| `staff` | `orders` | **1 : N** | `orders.staff_id` | One staff member handles/intakes many orders; each order is logged by one staff member. |
| `order_statuses` | `orders` | **1 : N** | `orders.status_id` | Multiple orders can concurrently be in the same lifecycle stage (`Washing`); each order has one status. |
| `orders` | `order_items` | **1 : N** | `order_items.order_id` | One order can contain multiple service line items (e.g., Wash & Fold + Ironing). |
| `service_types` | `order_items` | **1 : N** | `order_items.service_id` | A single catalog service can be included in many customer order line items. |
| `orders` | `payments` | **1 : N** | `payments.order_id` | An order begins with 0 payments (unpaid), receives 1 full payment, or logs multiple payment records for audits/refunds. |
| `orders` | `deliveries` | **1 : N** | `deliveries.order_id` | An order can have delivery/pickup transport tickets created to manage scheduled dispatch. |
| `staff` | `deliveries` | **1 : N** | `deliveries.rider_id` | A staff member designated as a Rider can be assigned to multiple delivery runs over time. |

---

### Constraints & Referential Integrity Rules

* **`ON DELETE CASCADE`**:
  * Used as a database-level referential-integrity rule for dependent child records: `orders` -> `order_items`, `payments`, and `deliveries`. The application does not expose permanent-delete endpoints; operational record removal uses archive/restore workflows.
* **`ON DELETE SET NULL`**:
  * Used for `deliveries.rider_id` -> `staff.staff_id`. If an employee profile is removed, historical delivery records are preserved with rider set to `NULL` (`"—"`), maintaining route and audit history.
* **`ON DELETE RESTRICT`**:
  * Used for `orders.customer_id` -> `customers.customer_id`, `orders.status_id` -> `order_statuses.status_id`, and `order_items.service_id` -> `service_types.service_id`. A customer or service cannot be deleted from the database if active orders currently depend on it.
* **`ON UPDATE CASCADE`**:
  * Applied to all foreign keys so any identifier updates propagate seamlessly across related tables.

---

## 4. System Features & Modules

### 1. Authentication & RBAC Guard
* **Role-Based Routing**: Restricts administrative capabilities (Staff Directory, Service Catalog Rate changes) to the `Manager` role.
* **Operational Roles**: Washer, Folder, and Rider accounts can log in for their operational views; server-side authorization still restricts staff administration, service pricing, and financial corrections.
* **Secure Sessions**: User credentials authenticated via bcrypt verification against database hashes.

### 2. Customer Management
* **Laguna Address Standardization**: Captures street-level addresses alongside specific Cabuyao barangays.
* **Validation**: Validates 11-digit Philippine mobile numbers (`09XXXXXXXXX`), rejecting non-numeric symbols or invalid prefixes.
* **Inline Order Creation**: Customers can be quickly registered directly inside the Order modal without leaving the order intake screen.

### 3. Order Intake & Pricing
* **Server-Calculated Pricing**: The server validates each submitted service line and calculates subtotals from the current active catalog rate; client-supplied totals are not trusted.
* **Current UI Limitation**: Order intake currently exposes one service line. The API accepts multiple service lines, but the edit form loads and preserves existing lines without allowing line-item edits. Editing other order fields does not replace or remove those lines.
* **Catalog Rates Integration**: Unit labels dynamically adjust between kilograms (`kg`) and piece count (`piece`) according to the selected service.

### 4. Operational Order Lifecycle Progression
* **Release-Specific Status Paths**:
  $$\text{Received} \longrightarrow \text{Washing} \longrightarrow \text{Folding} \longrightarrow \begin{cases} \text{Ready for Pickup} & (\text{Pickup}) \\ \text{Out for Delivery} & (\text{Delivery}) \end{cases} \longrightarrow \text{Completed}$$
* **Enforced Transitions**: The server accepts only the current state or the next state in the applicable path. `Completed` is final; only a Manager can explicitly reopen an order. A Delivery order reaches `Out for Delivery` when its run starts and reaches `Completed` when its run completes. Pickup orders advance through `Ready for Pickup`.
* **Release Date**: Completing an order or its delivery run sets `release_date` on the server. Orders cannot be completed until fully paid.

### 5. Service Catalog & Rates
* **Complete Category Coverage**: Supports all 6 shop service classifications: `Wash & fold`, `Wash & dry`, `Pressing`, `Specialty care`, `Bedding & bulky`, and `Dry cleaning`.
* **Discontinue vs. Reactivate**: Managers can discontinue a service, immediately hiding it from new order creation dropdowns while preserving historical invoice calculations. Discontinued services can be reactivated with a single click.

### 6. Payment Settlement & Billing
* **Full-Balance Settlement**:
  * Payments must equal the exact remaining balance; the server serializes payment creation and rejects partial, excess, or duplicate-reference payments.
  * The outstanding balance includes active, non-cancelled delivery fees. Changing a fee after full payment is blocked.
  * An order cannot be completed or archived until it is fully paid.
* **Exclusion of Settled Orders**: Fully paid orders are automatically excluded from the "Record Payment" order dropdown.
* **Direct Status Allocation**: New payments are automatically logged with status `"Paid"`.
* **Printable Invoices & Receipts**: Generates clean, printable HTML payment receipts and invoices complete with transaction timestamps, customer details, itemized service lines, and balance summaries.

### 7. Pickup & Delivery Transport Logistics
* **Fulfillment Segmentation**: Clear segmentation between in-store customer counter pickups and rider home deliveries.
* **Rider Assignment Protection**: Pickup tickets cleanly display `"—"` rather than an inappropriate `"Unassigned"` rider badge.
* **Single-Run Constraint**: Orders that have already been picked up or completed are excluded from scheduling new transport runs.
* **Run Completion Synchronization**: Run status changes follow an explicit transition sequence and cannot skip the linked order's ready stage. Completing a run updates the linked order to `Completed`.
* **Fee Billing**: Non-cancelled, non-archived Delivery run fees are part of the order total; Pickup run fees are not.

### 8. Staff Management & Sole-Manager Safeguards
* **Duplicate Email Prevention**: Prevents duplicate email accounts on both the client (real-time input & blur warnings) and server (`SELECT` check + MySQL UNIQUE key fallback returning HTTP `400`).
* **Sole-Manager Protection**: The system detects if only one active Manager exists. It blocks that manager from self-deactivation, changing their own role, or archiving their account, preventing accidental shop lockout.

### 9. Soft Archiving & Restoration Audit Hub
* **Two-Way Recovery**: Inactive customers, discontinued services, completed and fully-paid orders, settled payments, delivery runs, and retired staff can be soft-archived (`is_archived = TRUE`) and restored by a Manager.
* **No Permanent Delete API**: Record deletion endpoints are not exposed; database initialization is non-destructive by default.
* **Centralized Archive Hub**: Accessible at `history.html`, where managers can filter records by category and restore them to active status at any time.

### 10. Executive Dashboard & Real-Time Analytics
* **Current Overview**: Displays registered customers, total orders, completed orders, and the latest orders. Payment revenue is returned only to Cashier and Manager dashboard requests; the current page does not display revenue or status-distribution charts.

---

## 5. End-to-End System Flows (UI -> API -> DB -> UI)

### Flow A: Creating a New Laundry Order
```
[User Interface]
  1. Cashier clicks "+ New Order" on orders.html.
  2. Selects customer, service ("Wash & Fold"), and enters weight (4.5 kg).
  3. UI auto-calculates total: ₱202.50.
  4. Clicks "Save Order".
         │
         ▼ HTTP POST /api/orders { customer_id: 1, service_id: 1, weight_kg: 4.5, release_type: "Pickup" }
[Express Backend - controllers/orders.js]
  5. Validates customer_id, service_id, and weight_kg > 0.
  6. Fetches current service unit rate from `service_types` (₱45.00/kg).
  7. Computes subtotal (4.5 * 45.00 = ₱202.50).
         │
         ▼ SQL Queries (Transaction)
[MySQL Database]
  8. INSERT INTO orders (customer_id, staff_id, status_id, order_date, release_type)
     VALUES (1, 1, 1, '2026-10-22', 'Pickup');  --> Generates order_id: 101
  9. INSERT INTO order_items (order_id, service_id, weight_kg, subtotal)
     VALUES (101, 1, 4.5, 202.50);
         │
         ▼ HTTP 201 Created { order_id: 101, total: 202.50, status: "Received" }
[User Interface]
 10. Modal closes, success toast displays: "New order created successfully."
 11. Orders table updates instantly, displaying order #ORD-0101 with badge "Received".
```

### Flow B: Advancing Laundry Order Progression
```
[User Interface]
  1. Operator views order #ORD-0101 in orders.html (Current status: "Received").
  2. Clicks quick-status action badge: "Advance to Washing".
         │
         ▼ HTTP PUT /api/orders/101/status { status_name: "Washing" }
[Express Backend - controllers/orders.js]
  3. Verifies transition validity in the lifecycle progression.
  4. Matches status_name "Washing" -> status_id: 2.
         │
         ▼ SQL Query
[MySQL Database]
  5. UPDATE orders SET status_id = 2 WHERE order_id = 101;
         │
         ▼ HTTP 200 OK { order_id: 101, status_id: 2, status: "Washing" }
[User Interface]
  6. Badge dynamically updates to purple/blue "Washing".
  7. Clicking advance again shifts status to "Folding" (status_id: 6).
```

### Flow C: Recording Full Payment
```
[User Interface]
  1. Cashier opens payments.html and clicks "Record Payment".
  2. Selects unpaid order #ORD-0101 (Balance due: ₱202.50).
  3. UI auto-fills Amount: ₱202.50 in a readonly input (partial payment blocked).
  4. Selects Method: "GCash" -> reference_no input field appears.
  5. Enters Reference #: "GCASH-78910".
  6. Clicks "Save Payment".
         │
         ▼ HTTP POST /api/payments { order_id: 101, amount: 202.50, method: "GCash", reference_no: "GCASH-78910" }
[Express Backend - controllers/payments.js]
  7. Queries database to check order total and existing payments:
     SELECT SUM(subtotal) FROM order_items WHERE order_id = 101;  --> ₱202.50
     SELECT SUM(amount_paid) FROM payments WHERE order_id = 101;  --> ₱0.00
     Remaining Balance = ₱202.50.
  8. Guard check: Requires the submitted amount to exactly equal the remaining balance (rejects partial and excess amounts with HTTP 400).
         │
         ▼ SQL Query
[MySQL Database]
  9. INSERT INTO payments (order_id, amount_paid, payment_method, reference_no, payment_date, status)
     VALUES (101, 202.50, 'GCash', 'GCASH-78910', '2026-10-22', 'Paid');
         │
         ▼ HTTP 201 Created { payment_id: 55, order_id: 101, status: "Paid" }
[User Interface]
 10. Modal closes, payment receipt auto-renders for printing.
 11. Order #ORD-0101 payment badge updates from "Unpaid" to green "Paid".
 12. Order #ORD-0101 is now removed from future "Record Payment" selection dropdowns.
```

### Flow D: Dispatching & Completing a Delivery Run
```
[User Interface]
  1. Cashier opens pickup-delivery.html and clicks "Schedule a run".
  2. Selects Delivery order #ORD-0102.
  3. Selects Rider: "Pedro Ramos", Date: "2026-10-22", Window: "1 - 3 PM".
  4. Clicks "Save". Run is logged with status "Scheduled".
  5. When rider departs, cashier clicks "Start" -> status becomes "On the way".
  6. After the order is fully paid, upon arrival the cashier clicks "Done" (Mark Completed).
         │
         ▼ HTTP PUT /api/deliveries/12 { status: "Completed" }
[Express Backend - controllers/deliveries.js]
  7. In one transaction, updates delivery status to "Completed".
  8. Resolves the "Completed" status by name, updates the linked order, and sets its release date using Manila local date.
         │
         ▼ SQL Queries (Transaction)
[MySQL Database]
  9. UPDATE deliveries SET status = 'Completed' WHERE delivery_id = 12;
 10. UPDATE orders SET status_id = (resolved Completed status), release_date = (Manila date) WHERE order_id = 102;
         │
         ▼ HTTP 200 OK
[User Interface]
 11. Delivery ticket displays badge "Completed".
 12. Orders page reflects #ORD-0102 as "Completed".
```

### Flow E: Soft Archiving & Restoring a Record
```
[User Interface]
  1. Manager clicks "Archive" on an old customer profile.
  2. Tactile confirmation modal appears with red "Archive" action button.
  3. Manager confirms.
         │
         ▼ HTTP PUT /api/customers/8/archive
[Express Backend - controllers/customers.js]
  4. Checks if customer has unsettled active orders.
  5. Sets `is_archived = TRUE`.
         │
         ▼ SQL Query
[MySQL Database]
  6. UPDATE customers SET is_archived = TRUE WHERE customer_id = 8;
         │
         ▼ HTTP 200 OK
[User Interface]
  7. Customer is removed from customers.html active list.
  8. When opening history.html, customer record appears under the "Customers" tab.
  9. Clicking "Restore" sends PUT /api/customers/8/restore -> `is_archived = FALSE`.
 10. Record instantly returns to the active customer list.
```

---

## 6. Defense Preparation & Panel Reviewer Q&A

### Q1: Why did you design the database in 3rd Normal Form (3NF)?
> **Model Answer**:  
> *"We designed the database in 3NF to eliminate data redundancy, enforce referential integrity, and prevent update/delete anomalies. By separating customer profiles, staff accounts, laundry services, orders, payments, and deliveries into their own normalized tables:*
> * *We eliminate transitive dependencies (e.g., customer addresses depend only on `customer_id`, not `order_id`).*
> * *We resolve the many-to-many relationship between orders and services using the `order_items` junction table.*
> * *If a laundry service rate changes today, historical order lines remain intact because past order totals were calculated and recorded in `order_items.subtotal` without altering past transaction integrity."*

---

### Q2: If you don't allow partial payments, why is the relationship between `orders` and `payments` 1:N instead of 1:1?
> **Model Answer**:  
> *"In relational database design, keeping `payments` in a separate 1:N table is best practice for three key reasons:*
> 1. * **Normalization (3NF)**: Payment attributes (method, transaction reference number, date, audit status) do not belong in the `orders` table. Merging them would violate 3NF and create null-heavy columns.*
> 2. * **Zero Payments (0..*)**: A newly created order starts with **zero payments** (Unpaid).*
> 3. * **Financial Audit Trails (>1 Payments)**: If a payment is refunded (`status = 'Refunded'`) due to a customer dispute and later repaid, the system can retain the original record and log the replacement rather than overwrite the payment history.*
> *The business policy of disallowing partial installments is enforced via application logic and backend validation (the submitted amount must exactly equal the remaining balance), not by compromising relational normalization."*

---

### Q3: Why did you choose soft deletion (`is_archived = TRUE`) instead of SQL `DELETE`?
> **Model Answer**:  
> *"In a commercial laundromat system, hard deleting rows with `DELETE FROM` would destroy historical accounting, customer order histories, and audit trails. Furthermore, foreign key constraints would block deleting a customer who has orders on record.*
> *By using a soft-deletion pattern with an `is_archived` boolean flag, inactive records are hidden from day-to-day operations while preserving complete database integrity. Managers can review historical data and restore accidentally archived records via the Archive Hub (`history.html`) without data loss."*

---

### Q4: How do you prevent SQL Injection and ensure backend security?
> **Model Answer**:  
> *"We enforce four security layers:*
> 1. * **Parameterized Queries**: All database queries executed through `mysql2/promise` use prepared statement placeholders (`?`). User inputs are never concatenated directly into SQL strings, neutralizing SQL Injection (SQLi) attacks.*
> 2. * **Password Hashing**: Employee passwords are never stored in plaintext. They are encrypted using `bcryptjs` with 10 salt rounds.*
> 3. * **Role-Based Access Control (RBAC)**: Critical administrative routes (like staff creation or service rate modification) verify staff role authorization via `middleware/auth.js` before executing any controller logic.*
> 4. * **Sole-Manager Lockout Prevention**: The system checks active manager counts to prevent the last active manager from deactivating, modifying, or archiving their own account."*

---

### Q5: How is the delivery route logistics tied to staff and orders?
> **Model Answer**:  
> *"Our `deliveries` table contains foreign keys to both `orders` (`order_id`) and `staff` (`rider_id`).*
> * *When a delivery run is completed, our backend controller executes a coordinated transaction that updates the delivery ticket to `Completed` and automatically updates the linked order's status to `Completed` with an actual release date.*
> * *The `rider_id` foreign key uses `ON DELETE SET NULL`. If an employee leaves the company, historical delivery records are preserved with rider set to `NULL` (`"—"`), maintaining delivery logs and addresses without foreign key violations."*

---

### Q6: How does the system handle Philippine-specific business requirements?
> **Model Answer**:  
> *"The system is built specifically for local laundromat workflows in Laguna:*
> * * **Currency**: Formatted with the official Philippine Peso sign (`₱`).*
> * * **Contact Number Format**: Strict validation requiring an 11-digit mobile number starting with `09` (`09XXXXXXXXX`).*
> * * **Address Standardization**: Incorporates specific Cabuyao barangays (Poblacion I-III, Banay-banay, Mamatid, Pulo, Sala, etc.) for both customer residences and delivery waypoints.*
> * * **Payment Instruments**: Built-in support for popular local digital e-wallets (GCash, Maya, QRPh) with mandatory reference number validation."*

---

## 7. Installation & Local Setup

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **MySQL Server** (v8.0.16 or higher, required for enforced CHECK constraints)
* **Git**

### Step-by-Step Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/AstrooKai/theFloorIsLaba.git
   cd theFloorIsLaba
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=laundry_shop_db
   JWT_SECRET=replace-with-a-long-random-secret
   ALLOWED_ORIGINS=http://localhost:5000
   DB_SSL=false
   ```
   `JWT_SECRET` must be set to a private random value. `DB_SSL=false` is for local development only; otherwise database TLS certificate verification is enabled. In production, set `ALLOWED_ORIGINS` to the exact trusted frontend origin(s).

4. **Initialize and Seed Database**:
   Run the automated database setup script:
   ```bash
   npm run db:init
   ```
   This creates the configured database when needed, applies `database/schema.sql`, and inserts sample data only into an empty database. Re-running it does not duplicate the seed.    In non-production environments the same safe, idempotent initialization runs on the first authenticated API request; production skips automatic initialization unless `AUTO_SEED=true` is explicitly configured.

   For an existing database created before the integrity constraints were added, back it up and use your MySQL client to run the preflight `SELECT` statements in `database/migrations/001_constraints.sql` first. Resolve all reported duplicates or invalid values; only when every query returns no rows, run that file's `ALTER TABLE` statements once. Do not execute the whole file as one script or apply this migration to a fresh database; the constraints are already included in `database/schema.sql`.

   The initializer refuses production or remote database targets unless `--force` is supplied. For an intentional production or remote initialization, run `npm run db:init -- --force`. Destructive reset additionally requires `ALLOW_DB_RESET=true`; `--force` alone never permits a reset.

   To explicitly drop and recreate the database for local testing, set `ALLOW_DB_RESET=true` and run `npm run db:reset`; this permanently deletes all data in the configured database. In PowerShell: `$env:ALLOW_DB_RESET='true'; npm run db:reset`. In Bash: `ALLOW_DB_RESET=true npm run db:reset`. The reset command refuses to run without that opt-in.

5. **Start the Application**:
   * For production:
     ```bash
     npm start
     ```
   * For development (with live reload via nodemon):
     ```bash
     npm run dev
     ```

6. **Access the Portal**:
   Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

### Default Credentials for Testing

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Manager** | `rosa.mendoza@laba.ph` | `admin123` | Full access (Staff, Rates, Archiving, Operations) |
| **Cashier** | `maria.santos@laba.ph` | `admin123` | Operational access (Orders, Intake, Payments, Runs) |
| **Washer** | `jose.delacruz@laba.ph` | `admin123` | Order workflow up to the ready stage |
| **Folder** | `ana.lopez@laba.ph` | `admin123` | Order workflow up to the ready stage |
| **Rider** | `pedro.ramos@laba.ph` | `admin123` | Delivery-run status updates |
