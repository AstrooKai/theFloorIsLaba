const express = require('express');
const router = express.Router();
const payments = require('../controllers/payments');

router.get('/', payments.getAllPayments);
router.get('/:id', payments.getPaymentById);
router.post('/', payments.createPayment);
router.put('/:id', payments.updatePayment);
router.put('/:id/archive', payments.archivePayment);
router.put('/:id/unarchive', payments.unarchivePayment);
router.delete('/:id', payments.deletePayment);

module.exports = router;
