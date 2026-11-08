import React from "react";
import {
  Pagination as PaginationShad,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Props = {
  currentPage: number;
  totalPages: number;
  handlePreviousPage: () => void;
  handleNextPage: () => void;
  handlePageChange: (pageNumber: number) => void;
};

function Pagination({
  currentPage,
  totalPages,
  handleNextPage,
  handlePreviousPage,
  handlePageChange,
}: Props) {
  if (totalPages <= 1) return null;

  return (
    <PaginationShad className="mt-10">
      <PaginationContent>
        <PaginationItem
          onClick={(e) => {
            e.preventDefault();
            if (currentPage > 1) handlePreviousPage();
          }}
        >
          <PaginationPrevious
            href="#"
            className={currentPage <= 1 ? "pointer-events-none opacity-40" : ""}
          />
        </PaginationItem>

        {Array.from({ length: totalPages }, (_, index) => index + 1)
          .filter((page) => {
            return (
              page === 1 || // Always show first page
              page === totalPages || // Always show last page
              Math.abs(page - currentPage) <= 1 // Show current and its neighbors
            );
          })
          .reduce((acc: (number | "...")[], page, i, arr) => {
            if (i > 0 && page - (arr[i - 1] as number) > 1) {
              acc.push("...");
            }
            acc.push(page);
            return acc;
          }, [])
          .map((page, index) => (
            <PaginationItem
              key={index}
              onClick={(e) => {
                e.preventDefault();
                if (typeof page === "number" && page !== currentPage) {
                  handlePageChange(page);
                }
              }}
            >
              {page === "..." ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink href="#" isActive={page === currentPage}>
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

        <PaginationItem
          onClick={(e) => {
            e.preventDefault();
            if (currentPage < totalPages) handleNextPage();
          }}
        >
          <PaginationNext
            href="#"
            className={
              currentPage >= totalPages ? "pointer-events-none opacity-40" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationShad>
  );
}

export default Pagination;
