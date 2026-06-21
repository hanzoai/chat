const express = require('express');
const requireGuestOrJwtAuth = require('~/server/middleware/requireGuestOrJwtAuth');
const endpointController = require('~/server/controllers/EndpointController');

const router = express.Router();
router.get('/', requireGuestOrJwtAuth, endpointController);

module.exports = router;
