const uap = require('ua-parser-js');
const { logger } = require('@hanzochat/data-schemas');
const { isEnabled, durableCache } = require('@hanzochat/api');
const { ViolationTypes } = require('@hanzochat/data-provider');
const { removePorts } = require('~/server/utils');
const denyRequest = require('./denyRequest');
const { getLogStores } = require('~/cache');
const { findUser } = require('~/models');

/** Read-through memo in front of the authoritative ban store; own namespace, per-entry TTL. */
const banCache = durableCache(ViolationTypes.BAN, 0);
const message = 'Your account has been temporarily banned due to violations of our service.';

/** @returns {string} Memo key for a ban lookup — prefixed under Redis, raw otherwise. */
const banCacheKey = (prefix, value, useRedis) => {
  if (!value) {
    return '';
  }
  return useRedis ? `ban_cache:${prefix}:${value}` : value;
};

/**
 * Respond to the request if the user is banned.
 *
 * @async
 * @function
 * @param {Object} req - Express Request object.
 * @param {Object} res - Express Response object.
 *
 * @returns {Promise<Object>} - Returns a Promise which when resolved sends a response status of 403 with a specific message if request is not of api/agents/chat. If it is, calls `denyRequest()` function.
 */
const banResponse = async (req, res) => {
  const ua = uap(req.headers['user-agent']);
  const { baseUrl, originalUrl } = req;
  if (!ua.browser.name) {
    return res.status(403).json({ message });
  } else if (baseUrl === '/v1/chat/agents' && originalUrl.startsWith('/v1/chat/agents/chat')) {
    return await denyRequest(req, res, { type: ViolationTypes.BAN });
  }

  return res.status(403).json({ message });
};

/**
 * Checks if the source IP or user is banned or not.
 *
 * @async
 * @function
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {import('express').NextFunction} next - Next middleware function.
 *
 * @returns {Promise<function|Object>} - Returns a Promise which when resolved calls next middleware if user or source IP is not banned. Otherwise calls `banResponse()` and sets ban details in `banCache`.
 */
const checkBan = async (req, res, next = () => {}) => {
  try {
    const { BAN_VIOLATIONS } = process.env ?? {};

    if (!isEnabled(BAN_VIOLATIONS)) {
      return next();
    }

    req.ip = removePorts(req);
    let userId = req.user?.id ?? req.user?._id ?? null;

    if (!userId && req?.body?.email) {
      const user = await findUser({ email: req.body.email }, '_id');
      userId = user?._id ? user._id.toString() : userId;
    }

    if (!userId && !req.ip) {
      return next();
    }

    const useRedis = isEnabled(process.env.USE_REDIS);
    const ipKey = banCacheKey('ip', req.ip, useRedis);
    const userKey = banCacheKey('user', userId, useRedis);

    const [cachedIPBan, cachedUserBan] = await Promise.all([
      ipKey ? banCache.get(ipKey) : undefined,
      userKey ? banCache.get(userKey) : undefined,
    ]);

    if (cachedIPBan || cachedUserBan) {
      req.banned = true;
      return await banResponse(req, res);
    }

    const banLogs = getLogStores(ViolationTypes.BAN);
    const duration = banLogs.opts.ttl;

    if (duration <= 0) {
      return next();
    }

    // `banLogs` is keyed by the raw ip / user id — `ipKey` and `userKey` are the
    // memo's keys and carry a prefix under Redis, so they must not be used here.
    const [ipBan, userBan] = await Promise.all([
      req.ip ? banLogs.get(req.ip) : undefined,
      userId ? banLogs.get(userId) : undefined,
    ]);

    const ban = ipBan || userBan;

    if (!ban) {
      return next();
    }

    // A record with no readable expiry is a ban that cannot be timed out. Deny
    // it, but never memo it — a NaN ttl is stored as no expiry at all, and the
    // entry (IP-keyed, so shared) would outlive the ban forever.
    const expiresAt = Number(ban.expiresAt);
    if (!ban.expiresAt || Number.isNaN(expiresAt)) {
      req.banned = true;
      return await banResponse(req, res);
    }

    const timeLeft = expiresAt - Date.now();

    if (timeLeft <= 0) {
      const cleanups = [];
      if (ipBan) {
        cleanups.push(banLogs.delete(req.ip));
      }
      if (userBan) {
        cleanups.push(banLogs.delete(userId));
      }
      await Promise.all(cleanups);
      return next();
    }

    const writes = [];
    if (ipKey) {
      writes.push(banCache.set(ipKey, ban, timeLeft));
    }
    if (userKey) {
      writes.push(banCache.set(userKey, ban, timeLeft));
    }
    // The memo is an optimization; a failed write must not un-ban the request.
    await Promise.all(writes).catch((err) =>
      logger.warn('[checkBan] Failed to write ban cache:', err),
    );

    req.banned = true;
    return await banResponse(req, res);
  } catch (error) {
    logger.error('Error in checkBan middleware:', error);
    return next(error);
  }
};

module.exports = checkBan;
