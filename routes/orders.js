const express = require('express');
const router = express.Router();
const orders = require('../controllers/orders');

router.get('/statuses', orders.getOrderStatuses);
router.get('/', orders.getAllOrders);
router.get('/:id', orders.getOrderById);
router.post('/', orders.createOrder);
router.put('/:id', orders.updateOrder);
router.delete('/:id', orders.deleteOrder);

module.exports = router;
