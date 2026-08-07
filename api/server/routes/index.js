const accessPermissions = require('./accessPermissions');
const assistants = require('./assistants');
const categories = require('./categories');
const adminAuth = require('./admin/auth');
const endpoints = require('./endpoints');
const staticRoute = require('./static');
const messages = require('./messages');
const memories = require('./memories');
const presets = require('./presets');
const prompts = require('./prompts');
const balance = require('./balance');
const usage = require('./usage');
const cloudUsage = require('./cloudUsage');
const routingDefaults = require('./routingDefaults');
const actions = require('./actions');
const apiKeys = require('./apiKeys');
const banner = require('./banner');
const search = require('./search');
const models = require('./models');
const convos = require('./convos');
const config = require('./config');
const agents = require('./agents');
const roles = require('./roles');
const files = require('./files');
const share = require('./share');
const tags = require('./tags');
const auth = require('./auth');
const keys = require('./keys');
const user = require('./user');
const mcp = require('./mcp');
const ask = require('./ask');
const runs = require('./runs');

module.exports = {
  mcp,
  ask,
  runs,
  auth,
  adminAuth,
  keys,
  apiKeys,
  user,
  tags,
  roles,
  files,
  share,
  banner,
  agents,
  convos,
  search,
  config,
  models,
  prompts,
  actions,
  presets,
  balance,
  usage,
  cloudUsage,
  routingDefaults,
  messages,
  memories,
  endpoints,
  assistants,
  categories,
  staticRoute,
  accessPermissions,
};
