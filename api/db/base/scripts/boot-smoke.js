'use strict';
/*
 * Boot smoke: drive the REAL wired boot entry points against Hanzo Base, the
 * same way api/server/index.js does:
 *   require('~/db').connectDb()  -> Base facade + collection provisioning
 *   require('~/models').seedDatabase() -> roles + default categories
 *
 * Proves the wired data layer boots on Base and that non-core models
 * (Role, AgentCategory) come along through the same adapter.
 *
 * Run: HANZO_BASE_URL=... HANZO_BASE_TOKEN=... node api/db/base/__tests__/boot-smoke.js
 */
const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, '../../..') }); // base = api/

const assert = require('assert');

async function main() {
  const { connectDb } = require('~/db');
  const { seedDatabase } = require('~/models');
  const { Role } = require('~/db/models');

  await connectDb();
  console.log('[boot] connectDb() OK — Base connected + collections provisioned');

  await seedDatabase();
  console.log('[boot] seedDatabase() OK — roles + categories seeded');

  const adminRole = await Role.findOne({ name: 'ADMIN' }).lean();
  assert(adminRole && adminRole.name === 'ADMIN', 'ADMIN role seeded to Base');
  console.log('  ok - ADMIN role present on Base:', adminRole.name);

  const userRole = await Role.findOne({ name: 'USER' }).lean();
  assert(userRole && userRole.name === 'USER', 'USER role seeded to Base');
  console.log('  ok - USER role present on Base:', userRole.name);

  console.log('\nBOOT SMOKE PASSED — wired data layer boots on Hanzo Base.');
  process.exit(0);
}

main().catch((e) => {
  console.error('\nBOOT SMOKE FAILED:', e && e.stack ? e.stack : e);
  process.exit(1);
});
