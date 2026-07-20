require('dotenv').config();
const fs = require('fs');
const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, '..') });
const cors = require('cors');
const axios = require('axios');
const express = require('express');
const passport = require('passport');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { logger } = require('@librechat/data-schemas');
const mongoSanitize = require('express-mongo-sanitize');
const {
  isEnabled,
  ErrorController,
  performStartupChecks,
  handleJsonParseError,
  initializeFileStorage,
  GenerationJobManager,
  createStreamServices,
} = require('@hanzochat/api');
const { connectDb, indexSync } = require('~/db');
const initializeOAuthReconnectManager = require('./services/initializeOAuthReconnectManager');
const createValidateImageRequest = require('./middleware/validateImageRequest');
const { jwtLogin } = require('~/strategies');
const { updateInterfacePermissions } = require('~/models/interface');
const { checkMigrations } = require('./services/start/migration');
const initializeMCPs = require('./services/initializeMCPs');
const configureSocialLogins = require('./socialLogins');
const { getAppConfig } = require('./services/Config');
const staticCache = require('./utils/staticCache');
const noIndex = require('./middleware/noIndex');
const { seedDatabase } = require('~/models');
const routes = require('./routes');

const { PORT, HOST, ALLOW_SOCIAL_LOGIN, DISABLE_COMPRESSION, TRUST_PROXY } = process.env ?? {};

// Allow PORT=0 to be used for automatic free port assignment
const port = isNaN(Number(PORT)) ? 3080 : Number(PORT);
const host = HOST || 'localhost';
const trusted_proxy = Number(TRUST_PROXY) || 1; /* trust first proxy by default */

const app = express();

const startServer = async () => {
  if (typeof Bun !== 'undefined') {
    axios.defaults.headers.common['Accept-Encoding'] = 'gzip';
  }
  await connectDb();

  logger.info('Connected to MongoDB');
  indexSync().catch((err) => {
    logger.error('[indexSync] Background sync failed:', err);
  });

  app.disable('x-powered-by');
  app.set('trust proxy', trusted_proxy);

  await seedDatabase();
  const appConfig = await getAppConfig();
  initializeFileStorage(appConfig);
  await performStartupChecks(appConfig);
  await updateInterfacePermissions(appConfig);

  const indexPath = path.join(appConfig.paths.dist, 'index.html');
  let indexHTML = fs.readFileSync(indexPath, 'utf8');

  // In order to provide support to serving the application in a sub-directory
  // We need to update the base href if the DOMAIN_CLIENT is specified and not the root path
  if (process.env.DOMAIN_CLIENT) {
    const clientUrl = new URL(process.env.DOMAIN_CLIENT);
    const baseHref = clientUrl.pathname.endsWith('/')
      ? clientUrl.pathname
      : `${clientUrl.pathname}/`;
    if (baseHref !== '/') {
      logger.info(`Setting base href to ${baseHref}`);
      indexHTML = indexHTML.replace(/base href="\/"/, `base href="${baseHref}"`);
    }
  }

  app.get('/health', (_req, res) => res.status(200).send('OK'));

  /* Middleware */
  app.use(noIndex);
  app.use(express.json({ limit: '3mb' }));
  app.use(express.urlencoded({ extended: true, limit: '3mb' }));
  app.use(handleJsonParseError);

  /**
   * Express 5 Compatibility: Make req.query writable for mongoSanitize
   * In Express 5, req.query is read-only by default, but express-mongo-sanitize needs to modify it
   */
  app.use((req, _res, next) => {
    Object.defineProperty(req, 'query', {
      ...Object.getOwnPropertyDescriptor(req, 'query'),
      value: req.query,
      writable: true,
    });
    next();
  });

  app.use(mongoSanitize());

  // CORS: restrict to known origins instead of wildcard.
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || process.env.DOMAIN_CLIENT || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const hanzoOriginRe =
    /^https:\/\/([a-z0-9-]+\.)?(hanzo\.(ai|chat|bot|id|team|app|build)|lux\.(chat|network|id)|zoo\.(ngo|network))$/;

  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow requests with no origin (server-to-server, curl, mobile apps).
        if (!origin) {
          return cb(null, true);
        }
        if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
          return cb(null, origin);
        }
        if (hanzoOriginRe.test(origin)) {
          return cb(null, origin);
        }
        return cb(null, false);
      },
      credentials: true,
    }),
  );

  // Security headers (HSTS, CSP, clickjacking, MIME-sniff).
  app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://analytics.hanzo.ai https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self' data: blob:; connect-src 'self' https://*.hanzo.ai https://*.hanzo.chat wss://*.hanzo.chat https://static.cloudflareinsights.com https://cloudflareinsights.com; frame-ancestors 'none';",
    );
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(cookieParser());

  if (!isEnabled(DISABLE_COMPRESSION)) {
    app.use(compression());
  } else {
    console.warn('Response compression has been disabled via DISABLE_COMPRESSION.');
  }

  app.use(staticCache(appConfig.paths.dist));
  app.use(staticCache(appConfig.paths.fonts));
  app.use(staticCache(appConfig.paths.assets));

  if (!ALLOW_SOCIAL_LOGIN) {
    console.warn('Social logins are disabled. Set ALLOW_SOCIAL_LOGIN=true to enable them.');
  }

  /* OAUTH */
  app.use(passport.initialize());
  passport.use(jwtLogin());

  if (isEnabled(ALLOW_SOCIAL_LOGIN)) {
    await configureSocialLogins(app);
  }

  app.use('/oauth', routes.oauth);
  /* API Endpoints */
  app.use('/v1/chat/auth', routes.auth);
  app.use('/v1/chat/admin', routes.adminAuth);
  app.use('/v1/chat/actions', routes.actions);
  app.use('/v1/chat/keys', routes.keys);
  app.use('/v1/chat/api-keys', routes.apiKeys);
  app.use('/v1/chat/user', routes.user);
  app.use('/v1/chat/search', routes.search);
  app.use('/v1/chat/messages', routes.messages);
  app.use('/v1/chat/convos', routes.convos);
  app.use('/v1/chat/presets', routes.presets);
  app.use('/v1/chat/prompts', routes.prompts);
  app.use('/v1/chat/categories', routes.categories);
  app.use('/v1/chat/endpoints', routes.endpoints);
  app.use('/v1/chat/balance', routes.balance);
  app.use('/v1/chat/models', routes.models);
  app.use('/v1/chat/config', routes.config);
  app.use('/v1/chat/assistants', routes.assistants);
  app.use('/v1/chat/files', await routes.files.initialize());
  app.use('/images/', createValidateImageRequest(appConfig.secureImageLinks), routes.staticRoute);
  app.use('/v1/chat/share', routes.share);
  app.use('/v1/chat/roles', routes.roles);
  app.use('/v1/chat/agents', routes.agents);
  app.use('/v1/chat/banner', routes.banner);
  app.use('/v1/chat/memories', routes.memories);
  app.use('/v1/chat/permissions', routes.accessPermissions);

  app.use('/v1/chat/tags', routes.tags);
  app.use('/v1/chat/mcp', routes.mcp);

  app.use(ErrorController);

  app.use((req, res) => {
    res.set({
      'Cache-Control': process.env.INDEX_CACHE_CONTROL || 'no-cache, no-store, must-revalidate',
      Pragma: process.env.INDEX_PRAGMA || 'no-cache',
      Expires: process.env.INDEX_EXPIRES || '0',
    });

    const rawLang = req.cookies.lang || req.headers['accept-language']?.split(',')[0] || 'en-US';
    // R-RED-10: Validate lang against BCP 47 locale pattern to prevent HTML injection.
    const localeRe = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
    const lang = localeRe.test(rawLang) ? rawLang : 'en-US';
    let updatedIndexHtml = indexHTML.replace(/lang="en-US"/g, `lang="${lang}"`);

    res.type('html');
    res.send(updatedIndexHtml);
  });

  app.listen(port, host, async (err) => {
    if (err) {
      logger.error('Failed to start server:', err);
      process.exit(1);
    }

    if (host === '0.0.0.0') {
      logger.info(
        `Server listening on all interfaces at port ${port}. Use http://localhost:${port} to access it`,
      );
    } else {
      logger.info(`Server listening at http://${host == '0.0.0.0' ? 'localhost' : host}:${port}`);
    }

    await initializeMCPs();
    await initializeOAuthReconnectManager();
    await checkMigrations();

    // Configure stream services (auto-detects Redis from USE_REDIS env var)
    const streamServices = createStreamServices();
    GenerationJobManager.configure(streamServices);
    GenerationJobManager.initialize();
  });
};

startServer();

let messageCount = 0;
process.on('uncaughtException', (err) => {
  if (!err.message.includes('fetch failed')) {
    logger.error('There was an uncaught error:', err);
  }

  if (err.message && err.message?.toLowerCase()?.includes('abort')) {
    logger.warn('There was an uncatchable abort error.');
    return;
  }

  if (err.message.includes('GoogleGenerativeAI')) {
    logger.warn(
      '\n\n`GoogleGenerativeAI` errors cannot be caught due to an upstream issue, see: https://github.com/google-gemini/generative-ai-js/issues/303',
    );
    return;
  }

  if (err.message.includes('fetch failed')) {
    if (messageCount === 0) {
      logger.warn('Meilisearch error, search will be disabled');
      messageCount++;
    }

    return;
  }

  if (err.message.includes('OpenAIError') || err.message.includes('ChatCompletionMessage')) {
    logger.error(
      '\n\nAn Uncaught `OpenAIError` error may be due to your reverse-proxy setup or stream configuration, or a bug in the `openai` node package.',
    );
    return;
  }

  if (err.stack && err.stack.includes('@librechat/agents')) {
    logger.error(
      '\n\nAn error occurred in the agents system. The error has been logged and the app will continue running.',
      {
        message: err.message,
        stack: err.stack,
      },
    );
    return;
  }

  if (isEnabled(process.env.CONTINUE_ON_UNCAUGHT_EXCEPTION)) {
    logger.error('Unhandled error encountered. The app will continue running.', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });
    return;
  }

  process.exit(1);
});

/** Export app for easier testing purposes */
module.exports = app;
