const express = require('express');
const { modelController } = require('~/server/controllers/ModelController');
const { requireGuestOrJwtAuth } = require('~/server/middleware/');

const router = express.Router();
router.get('/', requireGuestOrJwtAuth, modelController);

module.exports = router;
