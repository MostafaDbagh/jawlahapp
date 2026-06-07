const express = require('express');
const router = express.Router();
const promotionController = require('../../controllers/promotionController');
const { authenticateToken, requireAccountType } = require('../../middleware/auth');

const ADMIN_TYPES = ['PLATFORM_OWNER', 'PLATFORM_ADMIN'];

// Any signed-in user can validate a code at checkout (must precede '/:id').
router.post('/validate', authenticateToken, promotionController.validate);

// Admin-only management
router.get('/', authenticateToken, requireAccountType(ADMIN_TYPES), promotionController.list);
router.post('/', authenticateToken, requireAccountType(ADMIN_TYPES), promotionController.create);
router.patch('/:id', authenticateToken, requireAccountType(ADMIN_TYPES), promotionController.update);
router.delete('/:id', authenticateToken, requireAccountType(ADMIN_TYPES), promotionController.remove);

module.exports = router;
