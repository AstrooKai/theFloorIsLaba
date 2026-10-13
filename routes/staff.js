const express = require('express');
const router = express.Router();
const staff = require('../controllers/staff');

router.get('/riders', staff.getRiders);
router.post('/login', staff.loginStaff);
router.get('/', staff.getAllStaff);
router.get('/:id', staff.getStaffById);
router.post('/', staff.createStaff);
router.put('/:id', staff.updateStaff);
router.delete('/:id', staff.deleteStaff);

module.exports = router;
