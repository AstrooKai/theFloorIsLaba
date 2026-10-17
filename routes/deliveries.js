const express = require('express');
const router = express.Router();
const deliveries = require('../controllers/deliveries');
const { authorizeRoles } = require('../middleware/auth');

router.get('/', deliveries.getAllDeliveries);
router.get('/:id', deliveries.getDeliveryById);
router.post('/', authorizeRoles('Cashier', 'Manager'), deliveries.createDelivery);
router.put('/:id', authorizeRoles('Rider', 'Cashier', 'Manager'), deliveries.updateDelivery);
router.put('/:id/archive', authorizeRoles('Manager'), deliveries.archiveDelivery);
router.put('/:id/unarchive', authorizeRoles('Manager'), deliveries.unarchiveDelivery);
router.delete('/:id', authorizeRoles('Manager'), deliveries.deleteDelivery);

module.exports = router;
