const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/dashboard');

router.get('/summary', dashboard.getDashboardSummary);

module.exports = router;
