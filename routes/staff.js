const express = require('express');
const router = express.Router();
const staff = require('../controllers/staff');
const { authorizeRoles } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.' }
});

router.get('/riders', staff.getRiders);
router.post('/login', loginLimiter, staff.loginStaff);
router.get('/', authorizeRoles('Manager'), staff.getAllStaff);
router.get('/:id', authorizeRoles('Manager'), staff.getStaffById);
router.post('/', authorizeRoles('Manager'), staff.createStaff);
router.put('/:id/archive', authorizeRoles('Manager'), staff.archiveStaff);
router.put('/:id/unarchive', authorizeRoles('Manager'), staff.unarchiveStaff);
router.put('/:id/toggle-status', authorizeRoles('Manager'), staff.toggleStaffStatus);
router.put('/:id', authorizeRoles('Manager'), staff.updateStaff);
router.delete('/:id', authorizeRoles('Manager'), staff.deleteStaff);

module.exports = router;
