const { getEndpointsConfig } = require('~/server/services/Config');
const { buildGuestEndpointsConfig } = require('~/server/services/guestConfig');

async function endpointController(req, res) {
  if (req.user?.guest === true) {
    return res.send(JSON.stringify(buildGuestEndpointsConfig()));
  }
  const endpointsConfig = await getEndpointsConfig(req);
  res.send(JSON.stringify(endpointsConfig));
}

module.exports = endpointController;
