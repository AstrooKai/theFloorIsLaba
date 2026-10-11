# CCS110 Frontend A — FreshFold Laundry Shop Order Tracking System

## Stack
HTML5, CSS, Bootstrap 5, vanilla JavaScript.

## Run
Open `index.html` in a modern browser. For best results, use VS Code Live Server. Bootstrap is loaded from a CDN, so an internet connection is needed for its stylesheet.

## Authentication prototype
- `index.html`: dedicated sign-in page
- `signup.html`: separate create-account page
- Users can create an account and then sign in with the credentials they registered. The demo staff access has been removed.
- Authentication is currently stored in browser `localStorage` for prototype demonstration only; passwords are not securely stored. Replace this with backend authentication before real use or submission as a complete database-connected system.

## Pages
- `index.html`: sign-in page and browser-side validation
- `signup.html`: account creation page and validation
- `dashboard.html`: laundry workflow overview, summary counts, and recent orders
- `customers.html`: customer create/read/update/delete, search, required fields and duplicate email check
- `orders.html`: laundry order CRUD, search, customer relationship selector, amount/date/status validation (Received, Washing, Drying, Ready for Pickup, Completed, Cancelled)
- `assets/styles.css`: responsive shared styles
- `assets/app.js`: demo data layer and page behavior

## Current data behavior
Customer and order records are stored in browser `localStorage`. The current signed-in user flag is stored in `sessionStorage`; prototype accounts are stored in `localStorage`. This allows a basic demonstration across page navigation in the same browser, but it is NOT a live database and is not shared between devices/users.

## Backend integration contract
Replace the localStorage functions in `assets/app.js` with `fetch()` calls to your backend API. Suggested REST endpoints:
- `POST /api/auth/login`
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id`
- `DELETE /api/orders/:id`

Suggested customer fields: `id`, `name`, `email`, `phone`, `address`.
Suggested order fields: `id`, `customerId`, `date`, `amount`, `status`, `notes`.
Use `customerId` as a foreign key in the database. The backend must validate all inputs again, enforce authorization, and handle database errors. Frontend validation improves usability but is not a security boundary.

## Important CCS110 alignment
The uploaded instructions require at least six related database tables for the complete group system, primary and foreign keys, sample records, and demonstration of SELECT/INSERT/UPDATE/DELETE plus a query involving WHERE, ORDER BY, and GROUP BY or JOIN. These two frontend modules do not replace the group's complete database and backend deliverables.
