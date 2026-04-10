import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type TablePaginationProps = {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    startItem: number;
    endItem: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
};

export default function TablePagination({
    page,
    pageSize,
    totalItems,
    totalPages,
    startItem,
    endItem,
    hasPreviousPage,
    hasNextPage,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50],
}: TablePaginationProps) {
    return (
        <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="text-sm text-muted-foreground">
                    Showing {startItem}-{endItem} of {totalItems}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) =>
                            onPageSizeChange(Number(value))
                        }
                    >
                        <SelectTrigger className="w-[88px]" size="sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start">
                            {pageSizeOptions.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                </span>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page - 1)}
                        disabled={!hasPreviousPage}
                    >
                        <ChevronLeft className="size-4" />
                        Prev
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page + 1)}
                        disabled={!hasNextPage}
                    >
                        Next
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
