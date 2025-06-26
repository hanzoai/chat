const { getVendorService } = require('../services/VendorService');

/**
 * Middleware to handle vendor mode transformations
 */
function vendorModeMiddleware(req, res, next) {
  const vendorService = getVendorService();
  
  if (!vendorService.isEnabled()) {
    return next();
  }

  // Transform the request for vendor mode
  vendorService.transformRequest(req);

  // Override the response json method to transform responses
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const transformedData = vendorService.transformResponse(data);
    return originalJson(transformedData);
  };

  next();
}

/**
 * Middleware to inject vendor UI configuration
 */
function vendorUIConfigMiddleware(req, res, next) {
  const vendorService = getVendorService();
  
  if (!vendorService.isEnabled()) {
    return next();
  }

  // Add vendor UI config to response locals
  res.locals.vendorConfig = vendorService.getUIConfig();
  
  next();
}

module.exports = {
  vendorModeMiddleware,
  vendorUIConfigMiddleware,
};