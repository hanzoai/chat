const { getBrandService } = require('../services/BrandService');

/**
 * Middleware to handle brand mode transformations
 */
function brandModeMiddleware(req, res, next) {
  const brandService = getBrandService();

  if (!brandService.isEnabled()) {
    return next();
  }

  // Transform the request for brand mode
  brandService.transformRequest(req);

  // Override the response json method to transform responses
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    const transformedData = brandService.transformResponse(data);
    return originalJson(transformedData);
  };

  next();
}

/**
 * Middleware to inject brand UI configuration
 */
function brandUIConfigMiddleware(req, res, next) {
  const brandService = getBrandService();

  if (!brandService.isEnabled()) {
    return next();
  }

  // Add brand UI config to response locals
  res.locals.brandConfig = brandService.getUIConfig();

  next();
}

module.exports = {
  brandModeMiddleware,
  brandUIConfigMiddleware,
};
