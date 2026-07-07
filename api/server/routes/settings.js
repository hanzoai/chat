const express = require('express');
const {
  updateFavoritesController,
  getFavoritesController,
} = require('~/server/controllers/FavoritesController');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

// Favorites — JWT-only (no guest chat).
router.get('/favorites', requireJwtAuth, getFavoritesController);
router.post('/favorites', requireJwtAuth, updateFavoritesController);

module.exports = router;
