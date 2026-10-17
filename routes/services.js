const express = require('express');
const router = express.Router();
const services = require('../controllers/services');

router.get('/', services.getAllServices);
router.get('/:id', services.getServiceById);
router.post('/', services.createService);
router.put('/:id', services.updateService);
router.put('/:id/toggle-status', services.toggleServiceStatus);
router.delete('/:id', services.deleteService);

module.exports = router;
