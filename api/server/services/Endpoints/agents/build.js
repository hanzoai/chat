const { logger } = require('@hanzochat/data-schemas');
const { isAgentsEndpoint, removeNullishValues, Constants } = require('@hanzochat/data-provider');
const { loadAgent } = require('~/models/Agent');

const buildOptions = (req, endpoint, parsedBody, endpointType) => {
  const { spec, iconURL, agent_id, ...model_parameters } = parsedBody;
  const agentPromise = loadAgent({
    req,
    spec,
    // No agent selected on the agents endpoint → ad-hoc (ephemeral) chat, so the
    // user gets a reply without first creating/selecting an agent. Mirrors the
    // access middleware, which treats a missing id as ephemeral.
    agent_id: isAgentsEndpoint(endpoint) && agent_id ? agent_id : Constants.EPHEMERAL_AGENT_ID,
    endpoint,
    model_parameters,
  }).catch((error) => {
    logger.error(`[/agents/:${agent_id}] Error retrieving agent during build options step`, error);
    return undefined;
  });

  /** @type {import('@hanzochat/data-provider').TConversation | undefined} */
  const addedConvo = req.body?.addedConvo;

  return removeNullishValues({
    spec,
    iconURL,
    endpoint,
    agent_id,
    endpointType,
    model_parameters,
    agent: agentPromise,
    addedConvo,
  });
};

module.exports = { buildOptions };
