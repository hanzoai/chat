const express = require('express');
const staticCache = require('../utils/staticCache');
const paths = require('~/config/paths');

const router = express.Router();
/* Generated images and avatars are written by us, as PNG/GIF, and are never
   gzip-encoded on disk — scanning every byte of every read proved nothing. */
router.use(staticCache(paths.imageOutput, { skipGzipScan: true }));

module.exports = router;
