const createTTSLimiters = require('./ttsLimiters');
const createSTTLimiters = require('./sttLimiters');

const { guestMessageLimiter } = require('./guestMessageLimiter');
const importLimiters = require('./importLimiters');
const uploadLimiters = require('./uploadLimiters');
const forkLimiters = require('./forkLimiters');
const toolCallLimiter = require('./toolCallLimiter');
const cloudAgentLimiter = require('./cloudAgentLimiter');
const messageLimiters = require('./messageLimiters');

module.exports = {
  ...uploadLimiters,
  ...importLimiters,
  ...messageLimiters,
  ...forkLimiters,
  guestMessageLimiter,
  toolCallLimiter,
  cloudAgentLimiter,
  createTTSLimiters,
  createSTTLimiters,
};
