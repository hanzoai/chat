/**
 * Keep the private surfaces out of search, leave the front door in.
 *
 * `/` is the signed-out PRODUCT landing (the app is the landing, 2026-07-28),
 * so it must be indexable — a public product nobody can find is not
 * self-service. What must never be a search result is a specific conversation
 * or a shared thread (`/c/*`, `/share/*`) and the API (`/v1/*`). This used to
 * noindex every response, including the landing.
 */
const PRIVATE = [/^\/v1\//, /^\/c\//, /^\/share\//];

const noIndex = (req, res, next) => {
  if (PRIVATE.some((p) => p.test(req.path))) {
    res.setHeader('X-Robots-Tag', 'noindex');
  }
  next();
};

module.exports = noIndex;
