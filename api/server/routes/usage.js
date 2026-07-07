const express = require('express');
const router = express.Router();
const controller = require('../controllers/Usage');
const { requireJwtAuth } = require('../middleware/');

router.get('/', requireJwtAuth, controller);

module.exports = router;
