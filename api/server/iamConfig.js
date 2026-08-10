/**
 * The SPA's IAM identity, resolved at RUNTIME and handed to the browser in the
 * HTML shell.
 *
 * `client/src/utils/iam.ts` used to read this from `import.meta.env.VITE_*`,
 * which Vite INLINES at build time — so the identity of the login client was
 * frozen into the bundle when the image was built. One image could therefore
 * only ever serve one brand's login, no matter what the server's environment
 * said, and the failure was not a refusal to start: a second brand booted
 * cleanly, served its own pages, and then sent every visitor to the FIRST
 * brand's issuer with the first brand's `client_id`. The issuer refuses the
 * unregistered `redirect_uri` and, being unable to redirect anywhere safely,
 * renders a dead end — so the product is unreachable while every health check
 * stays green.
 *
 * The server already knows the right answer: `OPENID_ISSUER` and
 * `OPENID_CLIENT_ID` are what the backend's own passport strategy registers
 * with, so taking the browser's copy from the same two variables makes the two
 * halves of one login incapable of disagreeing. That is the point of doing it
 * here rather than adding a third place to configure.
 *
 * Anything unset falls through to the bundle's compiled default, so a
 * deployment that sets none of this behaves exactly as it did before.
 */

/** The global the SPA reads before its own build-time defaults. */
const GLOBAL = '__HANZO_IAM__';

/**
 * The browser's IAM config, or null when the environment states none.
 *
 * Keys are omitted rather than emitted empty: the client falls back per KEY, so
 * an empty string would override a good compiled default with nothing.
 */
function iamConfig() {
  const config = {};
  if (process.env.OPENID_ISSUER) {
    config.serverUrl = process.env.OPENID_ISSUER;
  }
  if (process.env.OPENID_CLIENT_ID) {
    config.clientId = process.env.OPENID_CLIENT_ID;
  }
  /* The org owning the application. IAM names applications `<org>-<app>`, but a
     convention is a poor thing to derive an identity from, so it is read and
     never inferred. */
  if (process.env.OPENID_ORG) {
    config.organization = process.env.OPENID_ORG;
  }
  return Object.keys(config).length > 0 ? config : null;
}

/**
 * Write the config into the HTML shell, ahead of every module script.
 *
 * `</head>` is the anchor because the scripts are declared in `<body>` and the
 * SPA reads this synchronously as it boots — there is no fetch to await, so the
 * OAuth callback route, which runs before any config request, sees the same
 * values as everything else.
 */
function injectIamConfig(html) {
  const config = iamConfig();
  if (!config) {
    return html;
  }
  /* `<` is escaped so a value can never close this script element early. The
     values are our own environment rather than user input, which makes this a
     cheap invariant to keep rather than a live threat to answer. */
  const json = JSON.stringify(config).replace(/</g, '\\u003c');
  const tag = `<script>window.${GLOBAL}=${json}</script>`;
  return html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`;
}

module.exports = { iamConfig, injectIamConfig, GLOBAL };
