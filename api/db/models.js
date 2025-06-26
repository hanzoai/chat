const mongoose = require('mongoose');
const { createModels } = require('@chat/data-schemas');
const models = createModels(mongoose);

module.exports = { ...models };
