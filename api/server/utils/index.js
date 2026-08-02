const removePorts = require('./removePorts');
const guestClientIp = require('./guestClientIp');
const handleText = require('./handleText');
const sendEmail = require('./sendEmail');
const refusal = require('./refusal');
const queue = require('./queue');
const files = require('./files');

module.exports = {
  ...handleText,
  ...refusal,
  removePorts,
  guestClientIp,
  sendEmail,
  ...files,
  ...queue,
};
