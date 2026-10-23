require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB, testConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

// Middleware
app.use(cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin))
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('./middleware/auth').authenticate);
app.use('/api', async (req, res, next) => {
    if (req.path === '/health' ||
        (process.env.AUTO_SEED !== 'true' && process.env.NODE_ENV === 'production')) {
        return next();
    }
    try {
        await initDB();
        return next();
    } catch (error) {
        return next(error);
    }
});

// Legacy login redirect
app.get(['/login', '/staff-login.html'], (req, res) => {
    res.redirect(302, '/');
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/customers', require('./routes/customers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/dashboard', require('./routes/dashboard'));

// 404 handler
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: true, message: `API route ${req.method} ${req.originalUrl} not found` });
    }
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: true,
        message: statusCode >= 500 ? 'Internal server error' : (err.message || 'Request failed'),
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
});

// Start local server
if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`Server running at http://localhost:${PORT}`);
        await testConnection();
    });
}

module.exports = app;
