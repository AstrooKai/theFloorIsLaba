const express = require('express');
const router = express.Router();
const orders = require('../controllers/orders');
const { authorizeRoles } = require('../middleware/auth');

router.get('/statuses', orders.getOrderStatuses);
router.get('/', orders.getAllOrders);
router.get('/:id', orders.getOrderById);
router.post('/', authorizeRoles('Cashier', 'Manager'), orders.createOrder);
router.put('/:id', authorizeRoles('Washer', 'Folder', 'Cashier', 'Manager'), orders.updateOrder);
router.put('/:id/archive', authorizeRoles('Manager'), orders.archiveOrder);
router.put('/:id/unarchive', authorizeRoles('Manager'), orders.unarchiveOrder);
router.delete('/:id', authorizeRoles('Manager'), orders.deleteOrder);

module.exports = router;
