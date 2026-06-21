const express = require('express');
const {
  updateFavoritesController,
  getFavoritesController,
} = require('~/server/controllers/FavoritesController');
const { requireJwtAuth, requireGuestOrJwtAuth } = require('~/server/middleware');

const router = express.Router();

// Read-only favorites are guest-safe (empty list); writes stay JWT-only.
router.get('/favorites', requireGuestOrJwtAuth, getFavoritesController);
router.post('/favorites', requireJwtAuth, updateFavoritesController);

module.exports = router;
