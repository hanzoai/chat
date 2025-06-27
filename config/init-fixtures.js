const path = require('path');
require('dotenv').config();
require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });

const { connectDb } = require('~/db');
const { User } = require('@hanzochat/data-schemas');
const { registerUser } = require('~/server/services/AuthService');
const { logger } = require('@hanzochat/data-schemas');

const DEMO_USER = {
  email: 'wow@this.com',
  password: 'demo',
  name: 'Demo User',
  username: 'wow',
  emailVerified: true,
};

async function initializeFixtures() {
  try {
    // Connect to database
    await connectDb();
    logger.info('[Fixtures] Connected to MongoDB');

    // Check if demo user already exists
    const existingUser = await User.findOne({
      $or: [{ email: DEMO_USER.email }, { username: DEMO_USER.username }],
    });

    if (existingUser) {
      logger.info('[Fixtures] Demo user already exists');
      process.exit(0);
    }

    // Create demo user
    logger.info('[Fixtures] Creating demo user...');
    const userPayload = {
      email: DEMO_USER.email,
      password: DEMO_USER.password,
      name: DEMO_USER.name,
      username: DEMO_USER.username,
      confirm_password: DEMO_USER.password,
    };

    const result = await registerUser(userPayload, {
      emailVerified: DEMO_USER.emailVerified,
    });

    if (result.status === 200) {
      logger.info('[Fixtures] Demo user created successfully');
      logger.info(`[Fixtures] Email: ${DEMO_USER.email}, Password: ${DEMO_USER.password}`);
    } else {
      logger.error('[Fixtures] Failed to create demo user:', result.message);
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    logger.error('[Fixtures] Error initializing fixtures:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeFixtures();
}
