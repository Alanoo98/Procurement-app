import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[], initialPageSize: number = 10, initialPage: number = 1) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, currentPage, pageSize]);
  
  const totalPages = Math.ceil(items.length / pageSize);
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  const changePageSize = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset to first page when changing page size
    setCurrentPage(1);
  };
  
  return {
    currentPage,
    totalPages,
    pageSize,
    paginatedItems,
    goToPage,
    changePageSize,
    totalItems: items.length,
  };
}
