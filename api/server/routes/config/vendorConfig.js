const { getVendorService } = require('../../services/VendorService');

const getVendorConfig = async (req, res) => {
  try {
    const vendorService = getVendorService();
    
    if (!vendorService.isEnabled()) {
      return res.json({ enabled: false });
    }

    const config = vendorService.getConfig();
    const uiConfig = vendorService.getUIConfig();
    
    res.json({
      ...config,
      ...uiConfig,
    });
  } catch (error) {
    console.error('Error getting vendor config:', error);
    res.status(500).json({ error: 'Failed to get vendor configuration' });
  }
};

module.exports = {
  getVendorConfig,
};