/**
 * Database connection.
 *
 * MongoDB has been dropped from Hanzo Chat — the data layer runs on Hanzo Base
 * (SQLite embedded / Postgres for prod multi-instance). `connectDb` initialises
 * the Base client and provisions every registered model's collection. See ./base.
 */
const { connectDb } = require('./base');

module.exports = { connectDb };
