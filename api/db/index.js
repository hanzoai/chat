const mongoose = require('mongoose');
const { createModels } = require('@chat/data-schemas');
const { connectDb } = require('./connect');
const indexSync = require('./indexSync');

createModels(mongoose);

module.exports = { connectDb, indexSync };
