# <span style="color: #ea580c;">TheFloorIsLaba</span>: Comprehensive QA & Testing Checklist

<blockquote style="border-left: 4px solid #ea580c; padding: 12px 18px; background-color: rgba(234, 88, 12, 0.08); border-radius: 6px; margin: 16px 0 24px 0;">

**Test Suite Summary:** **94 Manual Test Cases** &bull; **0 Verified in this change set** &bull; **94 Pending Verification**

- **1. Authentication & Session Management:** verification pending
- **2. Role-Based Access Control (RBAC):** verification pending
- **3. Overview & Dashboard Analytics:** verification pending
- **4. Order Management & Lifecycle:** verification pending
- **5. Invoice Generation & Print Layout:** verification pending
- **6. Customer Management:** verification pending
- **7. Pickup & Delivery Transport Runs:** verification pending
- **8. Payments, Methods & Invoicing:** verification pending
- **9. Service Catalog & Rates:** verification pending
- **10. Staff Management:** verification pending
- **11. Archived Records & History:** verification pending
- **12. UI/UX, Themes & Responsive Mobile Views:** verification pending
- **13. Database Operations & Cloud Deployment Readiness:** verification pending

**Progress:** 0.0% verified (0/94)

**Test Environment:** `http://localhost:5000`

**Database:** MySQL 8.0.16+ (Local); database-backed scenarios require a configured test database.

</blockquote>

---

## Default Test Accounts & Credentials

| Role | Name | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- | :--- |
| **Manager** | Rosa Mendoza | `rosa.mendoza@laba.ph` | `admin123` | Full system access (all views, staff, rates) |
| **Cashier** | Maria Santos | `maria.santos@laba.ph` | `admin123` | Orders, Customers, Payments, Pickup & Delivery |
| **Washer** | Jose Dela Cruz | `jose.delacruz@laba.ph` | `admin123` | Orders (status update), Overview |
| **Folder** | Ana Lopez | `ana.lopez@laba.ph` | `admin123` | Orders (status update), Overview |
| **Rider** | Pedro Ramos | `pedro.ramos@laba.ph` | `admin123` | Pickup & Delivery (run status updates) |

---

## 1. Authentication & Session Management

- [ ] **1.1 Empty Field Validation on Login**
  - **Steps:** Navigate to `http://localhost:5000/` (or `/index.html`), leave email and password blank, click "Sign In".
  - **Expected:** Inline alert box displays `"Please enter both email and password."` without refreshing the page.

- [ ] **1.2 Invalid Credentials Handling**
  - **Steps:** Enter `rosa.mendoza@laba.ph` with incorrect password `wrongpass` and click "Sign In".
  - **Expected:** Inline error message displays `"Invalid email or password"`. Password field remains masked.

- [ ] **1.3 Password Visibility Toggle**
  - **Steps:** Enter characters in the password field and click the "Show" button.
  - **Expected:** Password input changes from `password` to `text` and button changes to "Hide". Clicking again reverts it to masked characters.

- [ ] **1.4 Successful Staff Login**
  - **Steps:** Enter `rosa.mendoza@laba.ph` and `admin123`, click "Sign In".
  - **Expected:** Form redirects immediately to `dashboard.html`. User profile and name appear in the sidebar.

- [ ] **1.5 Session Persistence**
  - **Steps:** After logging in, refresh the page or open a new browser tab (e.g., right-click a sidebar navigation link and select "Open link in new tab", or open `orders.html` in a new tab).
  - **Expected:** User remains authenticated across all browser tabs without being redirected back to the login screen.

- [ ] **1.6 Unauthenticated Route Protection**
  - **Steps:** Clear `localStorage` or open an incognito window, then attempt to navigate directly to `http://localhost:5000/dashboard.html`.
  - **Expected:** Page automatically redirects to `/index.html` (or root login page).

- [ ] **1.7 Staff Sign Out**
  - **Steps:** Click the "Sign Out" button at the bottom of the workspace sidebar.
  - **Expected:** Authentication tokens are cleared from `localStorage` and browser redirects cleanly to `/index.html`.

---

## 2. Role-Based Access Control (RBAC)

- [ ] **2.1 Manager Access Scope**
  - **Steps:** Log in as `rosa.mendoza@laba.ph` (Manager).
  - **Expected:** All sidebar links are visible and accessible: Overview, Orders, Customers, Pickup & Delivery, Payments, Services, Staff, History.

- [ ] **2.2 Cashier Restricted Access**
  - **Steps:** Log in as `maria.santos@laba.ph` (Cashier).
  - **Expected:** Can view/create orders, take payments, and view customers. Access to Staff Management and editing service prices is restricted/hidden.

- [ ] **2.3 Washer Station View**
  - **Steps:** Log in as `jose.delacruz@laba.ph` (Washer).
  - **Expected:** Primary workflow focuses on Orders. Can update washing, drying, folding, and ready statuses. Sensitive cashiering and staff links are restricted.

- [ ] **2.4 Delivery Rider Access**
  - **Steps:** Log in as `pedro.ramos@laba.ph` (Rider).
  - **Expected:** Pickup & Delivery view is accessible to advance transport run stages. Access to system configurations is denied.

- [ ] **2.5 Archived Staff Login Block**
  - **Steps:** Soft-archive a staff member, then attempt to log into their account.
  - **Expected:** Login request is rejected with inactive staff status message.

---

## 3. Overview & Dashboard Analytics

- [ ] **3.1 Banner Greeting & Staff Badge**
  - **Steps:** Navigate to `dashboard.html`.
  - **Expected:** Banner renders with quick action link ("Track laundry orders &rarr;"), workspace status, and sidebar displays current staff profile name and role badge.

- [ ] **3.2 Primary Metrics Counters**
  - **Steps:** Review the top statistics row (Registered Customers, Total Laundry Orders, Completed Orders).
  - **Expected:** Metric numbers match current database records (active customers, total recorded orders, and strictly completed orders).

- [ ] **3.3 Quick Action Navigation**
  - **Steps:** Click "Track laundry orders &rarr;" quick action button in the banner.
  - **Expected:** Navigates directly to `orders.html` for managing and viewing orders.

- [ ] **3.4 Recent Orders Table**
  - **Steps:** Inspect the recent orders list on the dashboard.
  - **Expected:** Orders show correct Order ID, customer name, order date, status badge, and total amount.

---

## 4. Order Management & Lifecycle

- [ ] **4.1 Create Pickup Order (Existing Customer)**
  - **Steps:** Open "New Order" modal, select an existing customer from dropdown, choose a laundry service (e.g. Wash and Fold), enter weight (e.g. 5.5 kg), select Release Type "Pickup".
  - **Expected:** Existing customer details (name, contact, address) auto-populate. Total amount calculates dynamically (`rate × weight`). Submitting inserts order with initial status "Received".

- [ ] **4.2 Create Delivery Order (New Customer on the Fly)**
  - **Steps:** Open "New Order" modal, select "+ New Customer", enter new customer first name, last name, contact number (`09XXXXXXXXX`), barangay, and street address. Select Release Type "Delivery", choose service and weight.
  - **Expected:** Total amount calculates dynamically. Submitting inserts both the new customer record and the order with status "Received" and Release Type "Delivery".

- [ ] **4.3 Service Rate & Weight Dynamic Calculation**
  - **Steps:** In the New Order modal, select different services (e.g., Wash and Fold at ₱45/kg vs Comforter Wash at ₱150/piece) and adjust the quantity / weight field.
  - **Expected:** Service unit label updates dynamically (`kg` vs `piece`), and the Total Amount field automatically recalculates accurately in real-time (`rate × quantity`).

- [ ] **4.4 Real-time Order Search**
  - **Steps:** Type customer name or Order ID in search bar `#fl_q`.
  - **Expected:** Table filters immediately to matching rows without full page reload.

- [ ] **4.5 Order Status Filter Dropdown**
  - **Steps:** Filter by "Received", "Washing", "Folding", "Ready for Pickup", "Out for Delivery", or "Completed".
  - **Expected:** Table displays only orders matching selected status.

- [ ] **4.6 Advance Order Workflow Status**
  - **Steps:** Click on the status badge in the orders table to cycle through workflow statuses. Pickup orders cycle through "Received" &rarr; "Washing" &rarr; "Folding" &rarr; "Ready for Pickup" &rarr; "Completed". Delivery orders cycle through "Received" &rarr; "Washing" &rarr; "Folding" &rarr; "Out for Delivery" &rarr; "Completed" (skipping "Ready for Pickup").
  - **Expected:** Status confirmation modal prompts for the release-type-appropriate transition, updates status badge, and persists changes.

- [ ] **4.7 Edit Order Details**
  - **Steps:** Click "Edit" on an active order, adjust weight or address, and save.
  - **Expected:** Updated weight and total recalculate and display properly.

- [ ] **4.8 Soft-Archive Order**
  - **Steps:** In the actions dropdown of an order, select "Archive" and confirm dialog.
  - **Expected:** Order is removed from active orders table and safely moved to Archived Records / History view.

- [ ] **4.9 Order Table Edge Spacing & Layout**
  - **Steps:** Inspect the orders table columns and padding across desktop and tablet screen widths.
  - **Expected:** Columns remain properly padded and no unwanted horizontal text collisions occur.

---

## 5. Invoice Generation & Print Layout

- [ ] **5.1 Open Invoice Modal**
  - **Steps:** In the actions dropdown of any order row in `orders.html`, click "Invoice".
  - **Expected:** `#invoiceModal` opens displaying store brand, customer details, order number, items breakdown, payment status, and totals.

- [ ] **5.2 Invoice Financial Breakdown**
  - **Steps:** Verify service line items, subtotal, total amount, amount paid, and balance due on the invoice.
  - **Expected:** Financial calculations are accurate and match the order and payment records.

- [ ] **5.3 Print Invoice Layout Preview**
  - **Steps:** Click the "Print Invoice" button inside the invoice modal.
  - **Expected:** Browser print dialog triggers. Print media styles (`@media print`) format a clean receipt layout.

- [ ] **5.4 Close Invoice Modal**
  - **Steps:** Click the "Close" button or press the Escape key.
  - **Expected:** Modal closes smoothly without freezing the backdrop.

---

## 6. Customer Management

- [ ] **6.1 Add New Customer**
  - **Steps:** Navigate to `customers.html` and click "Add Customer". Enter first name, last name, mobile number (`09XXXXXXXXX`), barangay, and street address.
  - **Expected:** Customer is created, appears in the customer table, and total customer count increments.

- [ ] **6.2 Phone Number Format Validation**
  - **Steps:** Attempt to enter an invalid telephone format or letters in the phone field.
  - **Expected:** Form flags invalid input or ensures 11-digit mobile convention (`0917XXXXXXX`).

- [ ] **6.3 Edit Customer Contact Details**
  - **Steps:** Click "Edit" on a customer, update street address or phone number, and save.
  - **Expected:** Table updates immediately and database stores modified info.

- [ ] **6.4 Soft-Delete / Archive Customer**
  - **Steps:** Select "Archive Customer" on a customer with no active ongoing orders.
  - **Expected:** Customer is removed from active list and moved to `history.html` without breaking historical order relationships. Customers with active (non-Completed) orders cannot be archived.

---

## 7. Pickup & Delivery Transport Runs

- [ ] **7.1 Transport Run Cards Display**
  - **Steps:** Navigate to `pickup-delivery.html`.
  - **Expected:** Transport tickets render grouped by date (or sorted) with customer name, contact, pickup/delivery address, assigned rider (if delivery), and run status.

- [ ] **7.2 Filter by Run Type and Status**
  - **Steps:** Use the Type filter dropdown ("Pickup", "Delivery") and Status filter dropdown ("Scheduled", "On the way", "Completed", "Cancelled") in the toolbar.
  - **Expected:** Transport run tickets dynamically filter according to the selected run type and lifecycle status.

- [ ] **7.3 Assign Rider to Delivery**
  - **Steps:** Click "Edit" on an unassigned delivery run, select a rider from the Rider dropdown (e.g. Pedro Ramos), and save.
  - **Expected:** Rider name is saved and ticket displays assigned rider.

- [ ] **7.4 Advance Delivery Status**
  - **Steps:** On a scheduled delivery run with an assigned rider, click "Start" (advancing from "Scheduled" &rarr; "On the way"). Then click "Done" / "Mark Completed" (advancing from "On the way" &rarr; "Completed").
  - **Expected:** Run moves through transit ("On the way") to "Completed", linked order release date is recorded, and linked order status advances to Completed.

- [ ] **7.5 Address & Landmark Visibility**
  - **Steps:** Inspect pickup and delivery tickets on `pickup-delivery.html`.
  - **Expected:** Full Laguna street address and barangay are clearly displayed with location icon, and notes/landmarks (if any) are cleanly visible.

- [ ] **7.6 Complete Transport Run**
  - **Steps:** For both a pickup and a delivery run, start from "Scheduled" and advance to "On the way", then select "Complete Pickup" / "Mark Completed". Try completing directly from "Scheduled" first.
  - **Expected:** Direct completion from "Scheduled" is rejected. After "On the way", the run can complete only when its order is fully paid; successful completion sets the linked order to "Completed", records its release date, and removes the order from the "Schedule a run" modal dropdown.

---

## 8. Payments, Methods & Invoicing

- [ ] **8.1 Record Cash Payment**
  - **Steps:** Navigate to `payments.html`, click "Record Payment", select an order with balance due, choose "Cash", verify Status dropdown is removed, and save.
  - **Expected:** Fully paid orders do not appear in the order selection dropdown, order balance due displays in modal hint upon selecting an unpaid order, reference number is not required for cash, payment is logged directly with status "Paid" (without unnecessary status dropdown prompt), and order payment status updates to "Paid".

- [ ] **8.2 Record GCash / Maya / QRPh Digital Payment**
  - **Steps:** Record payment using digital/card payments ("GCash", "Maya", "QRPh", or "Card"), enter reference number (e.g. `GCASH-98214`), and save.
  - **Expected:** Reference number is required for digital payments; payment is logged with reference code and method name.

- [ ] **8.3 Non-Editable Amount & Full Payment Enforcement**
  - **Steps:** Navigate to `payments.html`, click "Record Payment", select an order with balance due, and inspect the "Amount (₱)" input field.
  - **Expected:** Amount input field is read-only (`readonly`), automatically populating the full order balance due. Partial payments are blocked on both frontend and backend.

- [ ] **8.4 Payment Method & Status Filters**
  - **Steps:** Filter payment log by Method ("Cash", "GCash", "Maya", "QRPh", "Card") or Status ("Paid", "Pending", "Refunded").
  - **Expected:** Only transactions matching selected payment instrument or status appear.

- [ ] **8.5 Payment Transaction Log Accuracy**
  - **Steps:** Verify Payment ID (`PAY-XXXX`), linked order (`ORD-XXXX`), customer name, method, payment date, amount, status, and Receipt action in the log.
  - **Expected:** Every financial transaction links to a valid order and shows complete audit details.

- [ ] **8.6 Payment Header Revenue Counters**
  - **Steps:** Review the summary metrics cards in the payments header (Paid Total, Pending Total, Total Payments).
  - **Expected:** Sums accurately reflect total collected revenue, pending funds, and total transaction count.

---

## 9. Service Catalog & Rates

- [ ] **9.1 Service Catalog List**
  - **Steps:** Navigate to `services.html`.
  - **Expected:** Active and Discontinued services tables render with service name, description, category, price per unit (kg/piece), turnaround duration, status badge, and actions.

- [ ] **9.2 Add New Service Type**
  - **Steps:** Click "Add Service", fill in service name (e.g. "Comforter & Duvet Care"), select category from aligned options ("Wash & fold", "Wash & dry", "Pressing", "Specialty care", "Bedding & bulky", "Dry cleaning"), charging unit ("Kilogram" or "Piece"), rate (e.g. ₱120.00), turnaround hours, and save.
  - **Expected:** All categories from the services catalog are available in the category dropdown; service is saved, appears in the Active Services table, and becomes selectable in the New Order modal.

- [ ] **9.3 Edit Existing Service Rate**
  - **Steps:** Click "Edit" on a service, modify price or turnaround hours, and save.
  - **Expected:** Service table updates immediately. New orders reflect updated rate; past historical orders retain their original pricing.

- [ ] **9.4 Discontinue Service**
  - **Steps:** In the actions dropdown of an active service, click "Discontinue" and confirm dialog.
  - **Expected:** Service is moved to the Discontinued Services table below and is hidden from New Order creation dropdowns.

- [ ] **9.5 Re-activate Discontinued Service**
  - **Steps:** In the actions dropdown of a discontinued service, click "Re-activate" and confirm dialog.
  - **Expected:** Service returns to the primary Active Services table and becomes selectable again in New Order creation.

---

## 10. Staff Management

- [ ] **10.1 Staff Directory Listing**
  - **Steps:** Navigate to `staff.html` as Manager.
  - **Expected:** Table displays all active staff with ID, staff member name, role badge, email, contact number, account status, and actions.

- [ ] **10.2 Add New Staff Member**
  - **Steps:** Click "Add Staff", provide first name, last name, role (Cashier, Manager, Washer, Folder, Rider), contact number, email, and password.
  - **Expected:** New staff record is saved with selected role and can authenticate via login view.

- [ ] **10.3 Duplicate Email Prevention**
  - **Steps:** Attempt to create a new staff member with an email that already exists.
  - **Expected:** Modal immediately displays duplicate email warning on the email input field and blocks submission; server validates and rejects creation with HTTP 400.

- [ ] **10.4 Edit Staff Role and Phone**
  - **Steps:** Click "Edit" on an existing staff member, update role, phone number, or account status, and save.
  - **Expected:** Table updates immediately and database stores change.

- [ ] **10.5 Soft-Archive Staff Member**
  - **Steps:** Click "Archive" on a staff record and confirm dialog.
  - **Expected:** Staff status updates to archived, they are moved to `history.html`, and can no longer log in. (System blocks archiving the sole active manager).

---

## 11. Archived Records & History

- [ ] **11.1 Category Chip Navigation**
  - **Steps:** Navigate to `history.html` and click between category chips or select from toolbar: All Records, Orders, Payments, Pickup & Delivery, Customers, Staff Accounts.
  - **Expected:** Corresponding archived records section/table filters smoothly with real-time record count badges.

- [ ] **11.2 Archived Orders Retention**
  - **Steps:** Check the Archived Orders table.
  - **Expected:** Archived orders are listed with Order ID, customer, date, release type, order status badge, payment status, amount, and Restore Order action.

- [ ] **11.3 Archived Customers Retention**
  - **Steps:** Check the Archived Customers table.
  - **Expected:** Soft-deleted customers appear with Customer Name, contact number, address, "Archived" status badge, and Restore Customer action.

- [ ] **11.4 Restore Record Workflow**
  - **Steps:** Click "Restore" in the actions dropdown of an archived record (Orders, Payments, Deliveries, Customers, or Staff) and confirm dialog.
  - **Expected:** Record is restored to active status (`is_archived = FALSE`) and reappears in the primary module view.

---

## 12. UI/UX, Themes & Responsive Mobile Views

- [ ] **12.1 Light / Dark Theme Switching**
  - **Steps:** Click the theme toggle icon (`#themeToggleBtn` in sidebar or mobile menu).
  - **Expected:** App switches between light and volcanic dark mode instantly. All cards, tables, text, modals, and toolbars maintain high-contrast readability. Preference persists on page reload.

- [ ] **12.2 Desktop Sidebar Collapse**
  - **Steps:** Click the sidebar toggle button (`#sidebarToggleBtn`) on desktop (> 992px).
  - **Expected:** Sidebar shrinks to compact icons-only mode. Content area smoothly expands to fill space. Clicking again restores full sidebar.

- [ ] **12.3 Sidebar Fixed Header and Footer**
  - **Steps:** On desktop, inspect the sidebar while scrolling vertically.
  - **Expected:** Logo brand header and bottom profile/logout section remain fixed in place while the middle navigation menu scrolls smoothly.

- [ ] **12.4 Mobile Responsive Drawer (< 992px)**
  - **Steps:** Resize browser to mobile/tablet width (< 992px).
  - **Expected:** Top sticky mobile bar appears with hamburger toggle. Clicking menu opens off-canvas sidebar drawer with backdrop overlay. Tapping backdrop or pressing Escape closes drawer.

- [ ] **12.5 Global Footer Verification**
  - **Steps:** Scroll to bottom on `dashboard.html`, `orders.html`, `customers.html`, `payments.html`, `pickup-delivery.html`, `services.html`, `staff.html`, `history.html`.
  - **Expected:** Centered footer renders consistently:  
    `"The Floor Is Laba. • © 2026 Laundromat Management System"`

---

## 13. Database Operations & Cloud Deployment Readiness

- [ ] **13.1 Local Server Health Check**
  - **Steps:** Send `GET /api/health` to `http://localhost:5000/api/health`.
  - **Expected:** Returns HTTP 200 with `{ "status": "ok", "timestamp": "..." }`.

- [ ] **13.2 Safe Database Initialization**
  - **Steps:** Run `npm run db:init` twice in terminal.
  - **Expected:** Schema is applied and seed data is inserted only once. The explicit reset command requires `ALLOW_DB_RESET=true`.

- [ ] **13.3 Vercel Serverless Route Compatibility**
  - **Steps:** Inspect `vercel.json` routing configurations.
  - **Expected:** Routes map `/api/(.*)` &rarr; `/server.js` and serve static files from `/public` without URL breaking.

- [ ] **13.4 Cloud Database URL Connection**
  - **Steps:** Provide `DATABASE_URL` in `.env.cloud` and run `npm run db:cloud:seed`.
  - **Expected:** Connects via SSL to cloud MySQL (Aiven/PlanetScale), executes cloud schema, and populates initial seed records.

---

## 14. Change-Set Regression Cases

- [ ] **14.1 API Requires a Signed Staff Token**
  - **Steps:** Call a protected API route with only `X-Staff-Role: Manager`, then call a Manager-only route with a valid Cashier token plus `X-Staff-Role: Manager`.
  - **Expected:** The first request receives HTTP `401`; the second receives HTTP `403`. Client-supplied role headers never change the signed token role.

- [ ] **14.2 Payment Must Settle the Exact Fee-Inclusive Balance**
  - **Steps:** Create a Delivery order with an active fee, then submit partial, excessive, and exact-balance payment requests.
  - **Expected:** Partial and excessive amounts receive HTTP `400`; exact balance succeeds once and the fee is included.

- [ ] **14.3 Paid Delivery Fee Cannot Be Changed**
  - **Steps:** Fully pay an order that has a Delivery run, then attempt to change its fee, cancel the run, and archive it.
  - **Expected:** Each action that would remove or reduce the paid Delivery fee is rejected, and the order total remains consistent with payments.

- [ ] **14.4 Order Status Progression Cannot Skip or Regress**
  - **Steps:** Attempt to skip a lifecycle stage, advance a Washer/Folder past the ready stage, complete an unpaid order, and advance a completed order without Manager reopen.
  - **Expected:** Invalid transitions and unpaid completion receive HTTP `400`; an explicit Manager reopen permits a valid earlier state.

- [ ] **14.5 Delivery Runs Respect Lifecycle Transitions**
  - **Steps:** Try starting delivery before the order is ready and completing a Pickup run before Ready for Pickup; then follow the valid path.
  - **Expected:** Premature transitions are rejected; valid transitions synchronize order status and release date.

- [ ] **14.6 Order Archive Requires Completion and Full Payment**
  - **Steps:** Try to archive an incomplete order and a completed but unpaid order, then fully pay a completed order and archive it.
  - **Expected:** The first two requests are rejected; only the completed, fully paid order is archived.

- [ ] **14.7 Existing Multi-Line Items Survive Order Edits**
  - **Steps:** Open an order with multiple service lines, edit a non-item field, save, and inspect its invoice.
  - **Expected:** The form reports that item-line editing is unsupported, and all existing lines and server-calculated subtotals remain intact.

- [ ] **14.8 Database Initialization Is Safe to Repeat**
  - **Steps:** Run `npm run db:init` twice on an initialized local database; separately run `npm run db:reset` without `ALLOW_DB_RESET=true`.
  - **Expected:** Initialization does not duplicate seed data; reset refuses without opt-in and does not drop data.

- [ ] **14.9 Permanent Delete Endpoints Are Not Available**
  - **Steps:** Send authenticated `DELETE` requests for customer, order, payment, staff, service, and delivery IDs.
  - **Expected:** Each returns HTTP `404`; supported records are managed through archive/discontinue and restore operations.

- [ ] **14.10 Unauthenticated GET Requests Are Rejected**
  - **Steps:** Send `GET /api/orders` without an Authorization header.
  - **Expected:** The request receives HTTP `401`.

- [ ] **14.11 Non-Cash Payments Require Unique References**
  - **Steps:** Submit a GCash payment without a reference, then reuse a GCash reference already recorded on another payment.
  - **Expected:** Both requests receive HTTP `400`; no duplicate payment is created.

- [ ] **14.12 Client-Submitted Subtotals Are Ignored**
  - **Steps:** Create an order with an active service, a valid weight, and a deliberately incorrect client-supplied subtotal.
  - **Expected:** The persisted line subtotal and order total equal the server-calculated weight multiplied by the active service rate, rounded to two decimals.

- [ ] **14.13 Only One Active Run Is Allowed Per Order**
  - **Steps:** Create a scheduled run for an order, then attempt to create a second scheduled run for that order.
  - **Expected:** The second request receives HTTP `400`; the order retains one active run.

- [ ] **14.14 Person Names Reject Digits and Symbols**
  - **Steps:** Create or update a customer using `Lisa123` and a staff/customer name using `@@@`.
  - **Expected:** Both are rejected with HTTP `400` and no invalid name is saved.

- [ ] **14.15 Service Names Reject Digits and Preserve Seed Names**
  - **Steps:** Submit a service named `Wash123`, then submit `Comforter & Duvet Care`.
  - **Expected:** The first is rejected with HTTP `400`; the seed service name passes validation.

- [ ] **14.16 Server Validates Phone, Service, Release, and Date Fields**
  - **Steps:** Submit a phone beginning with `+`, an invalid service unit/category, a zero or over-limit service rate, an unsupported order release type or run status, and an invalid date.
  - **Expected:** Each invalid request receives HTTP `400`; normalized valid phones contain digits only, and valid catalog/service values are persisted.

- [ ] **14.17 Delivery Run Type and Customer Contact Defaults**
  - **Steps:** Attempt to create a run whose type differs from the order release type; for a matching type, omit contact and address and inspect the created run. Then try to schedule a second active run.
  - **Expected:** A mismatched type and second active run receive HTTP `400`; the first matching run uses the customer's saved phone and address rather than a placeholder.

- [ ] **14.18 Revoked Staff Tokens**
  - **Steps:** Log in as a staff member, archive or deactivate the account (or demote its role), then call a protected endpoint with the existing token.
  - **Expected:** An archived/deactivated account receives HTTP `401`; a demoted account can no longer access endpoints reserved to its former role.

- [ ] **14.19 Customer Data Role Restriction**
  - **Steps:** Call `GET /api/customers` and `GET /api/customers/:id` as Washer, Folder, and Rider; repeat as Cashier and Manager.
  - **Expected:** Operational roles receive HTTP `403`; Cashier and Manager can access customer records needed for their work.

- [ ] **14.20 Rider Run Ownership and Field Restrictions**
  - **Steps:** As a Rider, retrieve another Rider's run, try to update it, then try to change the fee or assignment on an assigned run before advancing its status.
  - **Expected:** Other Riders' runs are not returned and cannot be retrieved or updated. Only the assigned Rider can advance their Delivery run status; attempts to change other fields receive HTTP `403`.

- [ ] **14.21 Cloud Seed Requires Unique Bootstrap Credentials**
  - **Steps:** Run the cloud seeder without `CLOUD_SEED_MANAGER_PASSWORD`, then seed an empty test cloud database with a unique 16–72-byte value and inspect the staff password hashes.
  - **Expected:** Missing/invalid bootstrap credentials stop seeding; the configured secret is hashed for the Manager, and none of the seeded accounts can use the repository's default password.

- [ ] **14.22 Staff Token Revocation and Current Role**
  - **Steps:** Log in, deactivate/archive the account and try the existing token; separately demote another logged-in Manager and try a Manager-only endpoint.
  - **Expected:** Inactive or archived accounts receive HTTP `401`; the demoted account receives HTTP `403` for Manager-only actions.

- [ ] **14.23 Customer Read Role Authorization**
  - **Steps:** Call customer list and detail endpoints with Washer, Folder, and Rider tokens, then with Cashier and Manager tokens.
  - **Expected:** Operational roles receive HTTP `403`; Cashier and Manager retain customer read access.

- [ ] **14.24 Rider Run Ownership and Update Scope**
  - **Steps:** As a Rider, list runs, request another Rider's run by ID, and attempt to change fee, address, or assignment on an assigned run.
  - **Expected:** The list contains only the Rider's non-archived assignments and does not expose fees; other Riders' runs are unavailable, and assigned Riders can change only run status.
