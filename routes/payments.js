const express = require('express');
const router = express.Router();
const payments = require('../controllers/payments');
const { authorizeRoles } = require('../middleware/auth');

router.get('/', authorizeRoles('Cashier', 'Manager'), payments.getAllPayments);
router.get('/:id', authorizeRoles('Cashier', 'Manager'), payments.getPaymentById);
router.post('/', authorizeRoles('Cashier', 'Manager'), payments.createPayment);
router.put('/:id', authorizeRoles('Manager'), payments.updatePayment);
router.put('/:id/toggle-status', authorizeRoles('Manager'), payments.togglePaymentStatus);
router.put('/:id/archive', authorizeRoles('Manager'), payments.archivePayment);
router.put('/:id/unarchive', authorizeRoles('Manager'), payments.unarchivePayment);
router.delete('/:id', authorizeRoles('Manager'), payments.deletePayment);

module.exports = router;
