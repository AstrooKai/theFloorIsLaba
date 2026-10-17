const express = require('express');
const router = express.Router();
const orders = require('../controllers/orders');

router.get('/statuses', orders.getOrderStatuses);
router.get('/', orders.getAllOrders);
router.get('/:id', orders.getOrderById);
router.post('/', orders.createOrder);
router.put('/:id', orders.updateOrder);
router.put('/:id/archive', orders.archiveOrder);
router.put('/:id/unarchive', orders.unarchiveOrder);
router.delete('/:id', orders.deleteOrder);

module.exports = router;
