import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationState {
  from?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  searchTerm?: string;
  filters?: {
    dateRange?: { start: string; end: string } | null;
    restaurant?: string;
    supplier?: string;
    categories?: string[];
    documentType?: 'all' | 'Faktura' | 'Kreditnota';
  };
  page?: number;
}

export const useNavigationState = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getNavigationState = (): NavigationState => {
    return (location.state as NavigationState) || {};
  };

  const navigateWithState = (
    to: string,
    state: NavigationState = {},
    replace: boolean = false
  ) => {
    navigate(to, {
      state: {
        ...state,
        from: location.pathname,
      },
      replace,
    });
  };

  const goBack = (defaultPath: string = '/') => {
    const state = getNavigationState();
    if (state.from) {
      navigate(state.from, { 
        state: {
          sortField: state.sortField,
          sortDirection: state.sortDirection,
          searchTerm: state.searchTerm,
          filters: state.filters,
          page: state.page,
        }
      });
    } else {
      navigate(defaultPath);
    }
  };

  return {
    getNavigationState,
    navigateWithState,
    goBack,
  };
};
