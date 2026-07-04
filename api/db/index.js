const { mongoose, connectDb } = require('./base');
const { createModels } = require('@librechat/data-schemas');
const indexSync = require('./indexSync');

// Register every model on the Base-backed mongoose facade.
createModels(mongoose);

module.exports = { connectDb, indexSync };
