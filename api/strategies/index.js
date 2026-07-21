const { setupOpenId, getOpenIdConfig } = require('./openidStrategy');
const openIdJwtLogin = require('./openIdJwtStrategy');
const jwtLogin = require('./jwtStrategy');

module.exports = {
  jwtLogin,
  setupOpenId,
  getOpenIdConfig,
  openIdJwtLogin,
};
