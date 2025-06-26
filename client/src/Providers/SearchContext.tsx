import { createContext, useContext } from 'react';
import type { SearchResultData } from 'chat-data-provider';

type SearchContext = {
  searchResults?: { [key: string]: SearchResultData };
};

export const SearchContext = createContext<SearchContext>({} as SearchContext);
export const useSearchContext = () => useContext(SearchContext);
