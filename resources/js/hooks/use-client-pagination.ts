import { useMemo, useState } from 'react';

export function useClientPagination<T>(items: T[], initialPageSize = 10) {
    const [page, setPageState] = useState(1);
    const [pageSize, setPageSizeState] = useState(initialPageSize);

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(page, totalPages);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;

        return items.slice(startIndex, startIndex + pageSize);
    }, [currentPage, items, pageSize]);

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem =
        totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

    const setPage = (nextPage: number) => {
        setPageState(Math.max(1, Math.min(nextPage, totalPages)));
    };

    const setPageSize = (nextPageSize: number) => {
        setPageSizeState(nextPageSize);
        setPageState(1);
    };

    return {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages,
        paginatedItems,
        startItem,
        endItem,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
        setPage,
        setPageSize,
    };
}
