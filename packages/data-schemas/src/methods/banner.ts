import type { Model } from 'mongoose';
import type { DataHandle } from '~/common/dataHandle';
import logger from '~/config/winston';
import type { IBanner, IUser } from '~/types';

export function createBannerMethods(handle: DataHandle) {
  /**
   * Retrieves the current active banner.
   */
  async function getBanner(user?: IUser | null): Promise<IBanner | null> {
    try {
      const Banner = handle.models.Banner as Model<IBanner>;
      const now = new Date();
      const banner = (await Banner.findOne({
        displayFrom: { $lte: now },
        $or: [{ displayTo: { $gte: now } }, { displayTo: null }],
        type: 'banner',
      }).lean()) as IBanner | null;

      if (!banner || banner.isPublic || user != null) {
        return banner;
      }

      return null;
    } catch (error) {
      logger.error('[getBanners] Error getting banners', error);
      throw new Error('Error getting banners');
    }
  }

  return { getBanner };
}

export type BannerMethods = ReturnType<typeof createBannerMethods>;
