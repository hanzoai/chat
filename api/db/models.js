const { mongoose } = require('./base');
const { createModels } = require('@librechat/data-schemas');
const models = createModels(mongoose);

module.exports = { ...models };
