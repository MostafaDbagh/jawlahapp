const express = require('express');
const router = express.Router();
const favoriteController = require('../../controllers/favoriteController');
const { authenticateToken } = require('../../middleware/auth');

// All favorites routes require authentication (favorites are per-user).
router.get('/', authenticateToken, favoriteController.list);
router.post('/', authenticateToken, favoriteController.add);
router.delete('/:item_type/:item_id', authenticateToken, favoriteController.remove);

module.exports = router;
