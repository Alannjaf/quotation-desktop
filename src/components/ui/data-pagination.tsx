import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DataPagination({
  currentPage,
  totalPages,
  onPageChange,
}: DataPaginationProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex w-[100px] items-center justify-start">
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}
      </div>
      <div className="flex w-[100px] items-center justify-end">
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}