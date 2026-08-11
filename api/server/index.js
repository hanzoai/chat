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
const { logger } = require('@hanzochat/data-schemas');
const { imagesRoute } = require('@hanzochat/data-provider');
const mongoSanitize = require('express-mongo-sanitize');
const {
  ErrorController,
  performStartupChecks,
  handleJsonParseError,
  initializeFileStorage,
  GenerationJobManager,
  createStreamServices,
} = require('@hanzochat/api');
const { connectDb, indexSync } = require('~/db');
const { contentSecurityPolicy } = require('./csp');
const initializeOAuthReconnectManager = require('./services/initializeOAuthReconnectManager');
const createValidateImageRequest = require('./middleware/validateImageRequest');
const { jwtLogin } = require('~/strategies');
const { updateInterfacePermissions } = require('~/models/interface');
const { checkMigrations } = require('./services/start/migration');
const initializeMCPs = require('./services/initializeMCPs');
const configureIamLogin = require('./iamLogin');
const { injectIamConfig } = require('./iamConfig');
const { injectIcons, mountIcons } = require('./icons');
const { getAppConfig } = require('./services/Config');
const { resolveAllowedOrigin } = require('./utils/allowedOrigins');
const staticCache = require('./utils/staticCache');
const noIndex = require('./middleware/noIndex');
const { seedDatabase } = require('~/models');
const routes = require('./routes');

const { PORT, HOST, TRUST_PROXY } = process.env ?? {};

// Allow PORT=0 to be used for automatic free port assignment
const port = isNaN(Number(PORT)) ? 3080 : Number(PORT);
const host = HOST || 'localhost';
const trusted_proxy = Number(TRUST_PROXY) || 1; /* trust first proxy by default */

const app = express();

/**
 * Images written before the namespace move are addressed by the
 * `/images/<user>/<file>` filepath stored in every historical conversation —
 * immutable history, not a second API. One permanent redirect maps them onto
 * the one namespace; nothing writes the old prefix any more.
 */
const imagesMoved = (req, res) => res.redirect(301, `${imagesRoute}${req.url}`);

const startServer = async () => {
  if (typeof Bun !== 'undefined') {
    axios.defaults.headers.common['Accept-Encoding'] = 'gzip';
  }
  await connectDb();

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

  /* The shell's own name, from the same APP_TITLE the running config reports.
     The built HTML carries whichever brand built it, and it is what a tab, a
     bookmark and a link unfurl show BEFORE any script runs — so on lux.chat the
     tab read "Hanzo Chat" until React replaced it, and a shared link said so
     forever. The SPA already titles itself from this value once it boots; this
     is the same answer, early enough to be true on arrival. */
  if (process.env.APP_TITLE) {
    const title = process.env.APP_TITLE.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    indexHTML = indexHTML.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  }

  /* The shell's marks, from the org this deployment already signs in against.
     Same reason as the title above and one step further back: the tab's icon is
     painted before the first byte of script and survives in a bookmark long
     after — see api/server/icons.js. */
  indexHTML = injectIcons(indexHTML, appConfig.paths.dist, process.env.OPENID_ORG);

  /* The browser's IAM identity travels in the shell, not in the bundle. Vite
     inlines `import.meta.env.VITE_*` at BUILD time, so without this the login
     client is whatever the image was built with and one image can serve exactly
     one brand's login — see api/server/iamConfig.js. */
  indexHTML = injectIamConfig(indexHTML);

  /* Liveness. Registered ahead of the middleware stack so a probe costs nothing
     and can never be answered by the SPA catch-all. */
  app.get('/v1/chat/health', (_req, res) => res.status(200).send('OK'));

  /* Middleware */
  app.use(noIndex);
  app.use(express.json({ limit: '3mb' }));
  app.use(express.urlencoded({ extended: true, limit: '3mb' }));
  app.use(handleJsonParseError);

  /**
   * Strips `$`-prefixed keys from user input. This is NOT vestigial Mongo
   * plumbing — keep it. There is no MongoDB, but the SQLite document store
   * still speaks Mongo-shaped queries: `stores/sqlite/engine.ts` interprets
   * `$eq $ne $in $nin $gt $gte $lt $lte $exists $regex $not $and $or $nor` in
   * filters and `$set $unset $inc $push $pull $addToSet` in updates. A
   * `{"$ne": null}` that reaches a filter is operator injection against SQLite
   * exactly as it would have been against Mongo, so the guard outlived the
   * database it was named for.
   *
   * Express 5 makes `req.query` read-only and express-mongo-sanitize rewrites
   * it in place, so the property is made writable first.
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

  // CORS: an exact list of first-party origins, from configuration.
  // `server/utils/allowedOrigins` is the one place that decides, and it explains
  // why this may never be a subdomain pattern.
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow requests with no origin (server-to-server, curl, mobile apps).
        if (!origin) {
          return cb(null, true);
        }
        return cb(null, resolveAllowedOrigin(origin) ?? false);
      },
      credentials: true,
    }),
  );

  // Security headers (HSTS, CSP, clickjacking, MIME-sniff).
  app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', contentSecurityPolicy);
    // microphone=(self): the composer mic (@hanzo/voice) calls getUserMedia on
    // THIS document. Denying it to our own origin made the mic throw
    // NotAllowedError and sit permanently disabled, blaming the user for a
    // policy the server sent. camera/geolocation stay denied — nothing uses them.
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
    next();
  });

  app.use(cookieParser());

  app.use(compression());

  /* This brand's marks answer BEFORE the built client's, because the built
     client's are whichever brand's were in the tree at build time — see
     api/server/icons.js. Ordered ahead of the three mounts below for that
     reason and no other. */
  mountIcons(app, appConfig.paths.dist, process.env.OPENID_ORG);

  app.use(staticCache(appConfig.paths.dist));
  app.use(staticCache(appConfig.paths.fonts));
  app.use(staticCache(appConfig.paths.assets));

  /* Auth: Hanzo IAM is the one identity provider. */
  app.use(passport.initialize());
  passport.use(jwtLogin());
  await configureIamLogin(app);

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
  app.use('/v1/chat/usage', routes.usage);
  app.use('/v1/chat/cloud-usage', routes.cloudUsage);
  app.use('/v1/chat/routing-defaults', routes.routingDefaults);
  app.use('/v1/chat/models', routes.models);
  app.use('/v1/chat/config', routes.config);
  app.use('/v1/chat/assistants', routes.assistants);
  app.use('/v1/chat/files', await routes.files.initialize());
  app.use(
    `${imagesRoute}/`,
    createValidateImageRequest(appConfig.secureImageLinks),
    routes.staticRoute,
  );
  app.use('/images/', imagesMoved);
  app.use('/v1/chat/share', routes.share);
  app.use('/v1/chat/roles', routes.roles);
  app.use('/v1/chat/agents', routes.agents);
  app.use('/v1/chat/banner', routes.banner);
  app.use('/v1/chat/memories', routes.memories);
  app.use('/v1/chat/permissions', routes.accessPermissions);

  app.use('/v1/chat/tags', routes.tags);
  app.use('/v1/chat/mcp', routes.mcp);
  app.use('/v1/chat/ask', routes.ask);
  app.use('/v1/chat/runs', routes.runs);
  /* No skills mount. `routes/skills.js` imports `canAccessSkillResource` from
     the middleware index — a middleware nobody has written — so requiring it
     throws before the server listens. The router, its types (which already name
     /v1/chat/skills) and its client queries are half-built; whoever finishes
     them mounts it here. */

  app.use(ErrorController);

  app.use((req, res) => {
    /* A request that names a FILE and reached this far is a file we do not have.
       Answering it with the SPA shell is what turns one missing asset into a
       permanently blank page: index.html declares 27 `<script type="module">`
       tags, we serve `Content-Type: text/html` for a `.js` URL, and under
       `X-Content-Type-Options: nosniff` the browser refuses the module ("Expected
       a JavaScript-or-Wasm module script but the server responded with a MIME
       type of text/html"). React never mounts, so #loading-container stays and
       the page is black. Worse, the shell arrives as a 200, so the Workbox
       service worker precaches it under the asset's URL with `revision: null` —
       cache-first and never revalidated — and no ordinary reload can recover;
       only a hard reload or unregistering the worker clears it.
       A 404 is both the honest answer and an unswallowable one. Extensionless
       paths are SPA routes and still get the shell. */
    const ext = path.extname(req.path).toLowerCase();
    if (ext && ext !== '.html') {
      res.status(404).type('txt').send('Not Found');
      return;
    }

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

  if (err.stack && err.stack.includes('@hanzochat/agents')) {
    logger.error(
      '\n\nAn error occurred in the agents system. The error has been logged and the app will continue running.',
      {
        message: err.message,
        stack: err.stack,
      },
    );
    return;
  }

  /* Anything that reaches here left the process in an unknown state. Exit and let
     the kubelet restart a clean one — a half-dead pod serves errors forever. */
  process.exit(1);
});

/** Export app for easier testing purposes */
module.exports = app;
