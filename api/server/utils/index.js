const removePorts = require('./removePorts');
const guestClientIp = require('./guestClientIp');
const handleText = require('./handleText');
const sendEmail = require('./sendEmail');
const queue = require('./queue');
const files = require('./files');

module.exports = {
  ...handleText,
  removePorts,
  guestClientIp,
  sendEmail,
  ...files,
  ...queue,
};
