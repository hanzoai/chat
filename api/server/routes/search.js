const express = require('express');
const { isEnabled } = require('@librechat/api');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');

const router = express.Router();

router.use(requireJwtAuth);

/**
 * Reports whether conversation/message search is available.
 *
 * Search now runs on Hanzo Base/SQLite (via the data-layer adapter), so it is
 * always available unless explicitly disabled with `SEARCH=false`.
 */
router.get('/enable', async function (req, res) {
  const disabled = 'SEARCH' in process.env && !isEnabled(process.env.SEARCH);
  return res.send(!disabled);
});

module.exports = router;
