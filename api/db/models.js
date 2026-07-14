const mongoose = require('mongoose');
const { createModels } = require('@hanzochat/data-schemas');
const models = createModels(mongoose);

module.exports = { ...models };
