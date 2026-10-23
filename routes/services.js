const express = require('express');
const router = express.Router();
const services = require('../controllers/services');
const { authorizeRoles } = require('../middleware/auth');

router.get('/', services.getAllServices);
router.get('/:id', services.getServiceById);
router.post('/', authorizeRoles('Manager'), services.createService);
router.put('/:id', authorizeRoles('Manager'), services.updateService);
router.put('/:id/toggle-status', authorizeRoles('Manager'), services.toggleServiceStatus);
module.exports = router;
