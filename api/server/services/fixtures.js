const { User } = require('@hanzochat/data-schemas');
const { registerUser } = require('./AuthService');
const { logger } = require('@hanzochat/data-schemas');

const DEMO_USER = {
  email: 'wow@this.com',
  password: 'demo',
  name: 'Demo User',
  username: 'wow',
  emailVerified: true
};

/**
 * Initialize fixtures for local development
 */
async function initializeFixtures() {
  try {
    // Only run fixtures in local development mode
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    // Check if demo user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: DEMO_USER.email }, 
        { username: DEMO_USER.username }
      ] 
    });

    if (existingUser) {
      logger.info('[Fixtures] Demo user already exists');
      return;
    }

    // Create demo user
    logger.info('[Fixtures] Creating demo user...');
    const userPayload = {
      email: DEMO_USER.email,
      password: DEMO_USER.password,
      name: DEMO_USER.name,
      username: DEMO_USER.username,
      confirm_password: DEMO_USER.password
    };

    const result = await registerUser(userPayload, { 
      emailVerified: DEMO_USER.emailVerified 
    });

    if (result.status === 200) {
      logger.info('[Fixtures] Demo user created successfully');
      logger.info(`[Fixtures] Email: ${DEMO_USER.email}, Password: ${DEMO_USER.password}`);
    } else {
      logger.error('[Fixtures] Failed to create demo user:', result.message);
    }
  } catch (error) {
    logger.error('[Fixtures] Error initializing fixtures:', error);
  }
}

module.exports = initializeFixtures;