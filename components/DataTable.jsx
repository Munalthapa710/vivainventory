"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DataTable({
  columns,
  data,
  rowKey = "id",
  pageSize = 8,
  onRowClick,
  emptyMessage = "No records found."
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [data.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * pageSize;
  const pageRows = data.slice(start, start + pageSize);

  function resolveKey(row, index) {
    return typeof rowKey === "function" ? rowKey(row, index) : row[rowKey];
  }

  function renderCell(row, column) {
    return column.render ? row && column.render(row) : row[column.key];
  }

  return (
    <div className="table-shell">
      <div className="divide-y divide-slate-100 md:hidden">
        {pageRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          pageRows.map((row, index) => (
            <article
              key={resolveKey(row, index)}
              className={`space-y-3 p-4 ${onRowClick ? "cursor-pointer" : ""}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <div
                  key={column.key || column.label}
                  className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-3"
                >
                  <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {column.label}
                  </p>
                  <div className="min-w-0 text-sm text-slate-700">
                    {renderCell(row, column)}
                  </div>
                </div>
              ))}
            </article>
          ))
        )}
      </div>

      <div className="hidden md:block table-scroll">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key || column.label} className={column.headerClassName}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => (
                <tr
                  key={resolveKey(row, index)}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key || column.label} className={column.className}>
                      {renderCell(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.length > pageSize ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-2"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-2"
              disabled={currentPage === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
