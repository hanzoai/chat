const { getBrandService } = require('../../services/BrandService');

const getBrandConfig = async (req, res) => {
  try {
    const brandService = getBrandService();

    if (!brandService.isEnabled()) {
      return res.json({ enabled: false });
    }

    const config = brandService.getConfig();
    const uiConfig = brandService.getUIConfig();

    res.json({
      ...config,
      ...uiConfig,
    });
  } catch (error) {
    console.error('Error getting brand config:', error);
    res.status(500).json({ error: 'Failed to get brand configuration' });
  }
};

module.exports = {
  getBrandConfig,
};
