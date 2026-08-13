import { atomWithTabStorage } from './utils';

export type Favorite = {
  agentId?: string;
  skillId?: string;
  model?: string;
  endpoint?: string;
  spec?: string;
};

export type FavoriteModel = {
  model: string;
  endpoint: string;
};

export type FavoritesState = Favorite[];

/**
 * This atom stores the user's favorite models/agents
 */
export const favoritesAtom = atomWithTabStorage<FavoritesState>('favorites', []);
