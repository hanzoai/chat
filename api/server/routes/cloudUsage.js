const express = require('express');
const router = express.Router();
const controller = require('../controllers/CloudUsage');
const { requireJwtAuth } = require('../middleware/');

router.get('/', requireJwtAuth, controller);

module.exports = router;
