const express = require('express');
const router = express.Router();
const customers = require('../controllers/customers');

router.get('/', customers.getAllCustomers);
router.get('/:id', customers.getCustomerById);
router.post('/', customers.createCustomer);
router.put('/:id', customers.updateCustomer);
router.put('/:id/archive', customers.archiveCustomer);
router.put('/:id/unarchive', customers.unarchiveCustomer);
router.delete('/:id', customers.deleteCustomer);

module.exports = router;
