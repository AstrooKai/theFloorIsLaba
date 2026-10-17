const express = require('express');
const router = express.Router();
const deliveries = require('../controllers/deliveries');

router.get('/', deliveries.getAllDeliveries);
router.get('/:id', deliveries.getDeliveryById);
router.post('/', deliveries.createDelivery);
router.put('/:id', deliveries.updateDelivery);
router.put('/:id/archive', deliveries.archiveDelivery);
router.put('/:id/unarchive', deliveries.unarchiveDelivery);
router.delete('/:id', deliveries.deleteDelivery);

module.exports = router;
