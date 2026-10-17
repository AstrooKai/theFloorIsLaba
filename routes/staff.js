const express = require('express');
const router = express.Router();
const staff = require('../controllers/staff');
const { authorizeRoles } = require('../middleware/auth');

router.get('/riders', staff.getRiders);
router.post('/login', staff.loginStaff);
router.get('/', authorizeRoles('Manager'), staff.getAllStaff);
router.get('/:id', authorizeRoles('Manager'), staff.getStaffById);
router.post('/', authorizeRoles('Manager'), staff.createStaff);
router.put('/:id/archive', authorizeRoles('Manager'), staff.archiveStaff);
router.put('/:id/toggle-status', authorizeRoles('Manager'), staff.toggleStaffStatus);
router.put('/:id', authorizeRoles('Manager'), staff.updateStaff);
router.delete('/:id', authorizeRoles('Manager'), staff.deleteStaff);

module.exports = router;
