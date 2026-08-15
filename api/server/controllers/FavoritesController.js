const { updateUser, getUserById } = require('~/models');

const MAX_FAVORITES = 50;
const MAX_STRING_LENGTH = 256;
/** The kinds a favorite may be, written once so no two refusals disagree. */
const KINDS = 'agentId, skillId, model+endpoint, or spec';

const updateFavoritesController = async (req, res) => {
  try {
    const { favorites } = req.body;
    const userId = req.user.id;

    if (!favorites) {
      return res.status(400).json({ message: 'Favorites data is required' });
    }

    if (!Array.isArray(favorites)) {
      return res.status(400).json({ message: 'Favorites must be an array' });
    }

    if (favorites.length > MAX_FAVORITES) {
      return res.status(400).json({
        code: 'MAX_FAVORITES_EXCEEDED',
        message: `Maximum ${MAX_FAVORITES} favorites allowed`,
        limit: MAX_FAVORITES,
      });
    }

    for (const fav of favorites) {
      for (const field of ['agentId', 'skillId', 'model', 'endpoint']) {
        if (fav[field] && fav[field].length > MAX_STRING_LENGTH) {
          return res
            .status(400)
            .json({ message: `${field} exceeds maximum length of ${MAX_STRING_LENGTH}` });
        }
      }
      /* `spec` is the one field with a shape rule of its own: null and undefined
       * mean absent, anything else must be a non-empty string. */
      if (fav.spec != null && (typeof fav.spec !== 'string' || fav.spec.length === 0)) {
        return res.status(400).json({ message: 'spec must be a non-empty string' });
      }
      if (typeof fav.spec === 'string' && fav.spec.length > MAX_STRING_LENGTH) {
        return res
          .status(400)
          .json({ message: `spec exceeds maximum length of ${MAX_STRING_LENGTH}` });
      }

      /* One entry names exactly ONE thing. `model` and `endpoint` are halves of
       * a single name, so they count once and must both be present. */
      const hasAgent = !!fav.agentId;
      const hasSkill = !!fav.skillId;
      const hasSpec = typeof fav.spec === 'string' && fav.spec.length > 0;
      const hasModelPart = !!fav.model || !!fav.endpoint;
      const hasModel = !!fav.model && !!fav.endpoint;
      const kinds = [hasAgent, hasSkill, hasSpec, hasModel].filter(Boolean).length;

      if (kinds > 1) {
        return res.status(400).json({ message: `Favorite cannot have multiple types (${KINDS})` });
      }
      if (hasSpec && (hasAgent || hasSkill || hasModelPart)) {
        return res.status(400).json({
          message: 'spec cannot be combined with agentId, skillId, model, or endpoint',
        });
      }
      if (hasAgent && hasModelPart) {
        return res.status(400).json({
          message: 'agentId cannot be combined with model or endpoint',
        });
      }
      if (hasSkill && hasModelPart) {
        return res.status(400).json({
          message: 'skillId cannot be combined with model or endpoint',
        });
      }
      if (hasModelPart && !hasModel) {
        return res.status(400).json({ message: 'model and endpoint must be provided together' });
      }
      if (kinds === 0) {
        return res.status(400).json({ message: `Each favorite must have one of: ${KINDS}` });
      }
    }

    const user = await updateUser(userId, { favorites });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.favorites);
  } catch (error) {
    console.error('Error updating favorites:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getFavoritesController = async (req, res) => {
  try {
    if (req.user?.guest === true) {
      return res.status(200).json([]);
    }
    const userId = req.user.id;
    const user = await getUserById(userId, 'favorites');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let favorites = user.favorites || [];

    if (!Array.isArray(favorites)) {
      favorites = [];
      await updateUser(userId, { favorites: [] });
    }

    res.status(200).json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  updateFavoritesController,
  getFavoritesController,
};
