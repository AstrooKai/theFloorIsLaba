require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redirect old /staff-login.html to clean route /login
app.get('/staff-login.html', (req, res) => {
    res.redirect(301, '/login');
});

// Clean route for Staff Login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff-login.html'));
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/customers', require('./routes/customers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/dashboard', require('./routes/dashboard'));

// 404 Fallback Handler
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: true, message: `API route ${req.method} ${req.originalUrl} not found` });
    }
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: true,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    await testConnection();
});
