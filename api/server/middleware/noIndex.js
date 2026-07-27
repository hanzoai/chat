/** A signed-in chat surface is never a search result. */
const noIndex = (_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  next();
};

module.exports = noIndex;
