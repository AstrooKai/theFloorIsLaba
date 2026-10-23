const express = require('express');
const router = express.Router();
const customers = require('../controllers/customers');
const { authorizeRoles } = require('../middleware/auth');

router.get('/', authorizeRoles('Cashier', 'Manager'), customers.getAllCustomers);
router.get('/:id', authorizeRoles('Cashier', 'Manager'), customers.getCustomerById);
router.post('/', authorizeRoles('Cashier', 'Manager'), customers.createCustomer);
router.put('/:id', authorizeRoles('Cashier', 'Manager'), customers.updateCustomer);
router.put('/:id/archive', authorizeRoles('Manager'), customers.archiveCustomer);
router.put('/:id/unarchive', authorizeRoles('Manager'), customers.unarchiveCustomer);
module.exports = router;
