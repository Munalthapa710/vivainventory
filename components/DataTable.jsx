"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronLeft,
  ChevronRight,
  Search
} from "lucide-react";

function getColumnId(column) {
  return column.key || column.label;
}

function canSort(column, sampleRow) {
  if (column.sortable === false) {
    return false;
  }

  if (column.sortValue || column.sortable === true) {
    return true;
  }

  return Boolean(
    column.key &&
      sampleRow &&
      Object.prototype.hasOwnProperty.call(sampleRow, column.key)
  );
}

function normalizeSortValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const asDate = Date.parse(value);

  if (!Number.isNaN(asDate) && typeof value === "string") {
    return asDate;
  }

  return String(value).toLowerCase();
}

export default function DataTable({
  columns,
  data,
  rowKey = "id",
  pageSize = 8,
  onRowClick,
  emptyMessage = "No records found.",
  searchable = false,
  searchPlaceholder = "Search records...",
  initialSort = null
}) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortState, setSortState] = useState(initialSort);
  const sampleRow = data[0];

  useEffect(() => {
    setPage(1);
  }, [data.length, pageSize, searchTerm, sortState?.key, sortState?.direction]);

  const sortableColumns = useMemo(
    () => columns.filter((column) => canSort(column, sampleRow)),
    [columns, sampleRow]
  );

  const processedRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    let nextRows = searchable && normalizedSearch
      ? data.filter((row) =>
          columns.some((column) => {
            const rawValue = column.searchValue
              ? column.searchValue(row)
              : column.key
                ? row[column.key]
                : "";

            return String(rawValue || "")
              .toLowerCase()
              .includes(normalizedSearch);
          })
        )
      : [...data];

    if (sortState?.key) {
      const activeColumn = columns.find(
        (column) => getColumnId(column) === sortState.key
      );

      if (activeColumn) {
        nextRows = [...nextRows].sort((leftRow, rightRow) => {
          const leftValue = normalizeSortValue(
            activeColumn.sortValue
              ? activeColumn.sortValue(leftRow)
              : activeColumn.key
                ? leftRow[activeColumn.key]
                : null
          );
          const rightValue = normalizeSortValue(
            activeColumn.sortValue
              ? activeColumn.sortValue(rightRow)
              : activeColumn.key
                ? rightRow[activeColumn.key]
                : null
          );

          if (leftValue < rightValue) {
            return sortState.direction === "asc" ? -1 : 1;
          }

          if (leftValue > rightValue) {
            return sortState.direction === "asc" ? 1 : -1;
          }

          return 0;
        });
      }
    }

    return nextRows;
  }, [columns, data, searchable, searchTerm, sortState]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = processedRows.slice(start, start + pageSize);
  const activeEmptyMessage =
    searchable && searchTerm.trim()
      ? "No matching records found."
      : emptyMessage;

  function resolveKey(row, index) {
    return typeof rowKey === "function" ? rowKey(row, index) : row[rowKey];
  }

  function renderCell(row, column) {
    return column.render ? row && column.render(row) : row[column.key];
  }

  function toggleSort(column) {
    const columnId = getColumnId(column);

    setSortState((current) => {
      if (!current || current.key !== columnId) {
        return {
          key: columnId,
          direction: "asc"
        };
      }

      if (current.direction === "asc") {
        return {
          key: columnId,
          direction: "desc"
        };
      }

      return null;
    });
  }

  return (
    <div className="table-shell">
      {searchable || sortableColumns.length > 0 ? (
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Table tools
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {processedRows.length} matching result{processedRows.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {searchable ? (
                <label className="relative min-w-0 sm:min-w-[18rem]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-11"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={searchPlaceholder}
                  />
                </label>
              ) : null}

              {sortableColumns.length > 0 ? (
                <select
                  className="input sm:w-[14rem]"
                  value={
                    sortState
                      ? `${sortState.key}:${sortState.direction}`
                      : ""
                  }
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    if (!nextValue) {
                      setSortState(null);
                      return;
                    }

                    const [key, direction] = nextValue.split(":");
                    setSortState({ key, direction });
                  }}
                >
                  <option value="">Default order</option>
                  {sortableColumns.flatMap((column) => {
                    const columnId = getColumnId(column);

                    return [
                      <option key={`${columnId}-asc`} value={`${columnId}:asc`}>
                        {column.label} (Ascending)
                      </option>,
                      <option key={`${columnId}-desc`} value={`${columnId}:desc`}>
                        {column.label} (Descending)
                      </option>
                    ];
                  })}
                </select>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="divide-y divide-slate-100 md:hidden">
        {pageRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            {activeEmptyMessage}
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
                  key={getColumnId(column)}
                  className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-3"
                >
                  <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {column.label}
                  </p>
                  <div className="min-w-0 break-words text-sm text-slate-700">
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
              {columns.map((column) => {
                const columnId = getColumnId(column);
                const isSortable = canSort(column, sampleRow);
                const isActiveSort = sortState?.key === columnId;

                return (
                  <th key={columnId} className={column.headerClassName}>
                    {isSortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-left text-inherit transition hover:text-slate-700"
                        onClick={() => toggleSort(column)}
                      >
                        <span>{column.label}</span>
                        {isActiveSort ? (
                          sortState.direction === "asc" ? (
                            <ArrowDownAZ className="h-4 w-4" />
                          ) : (
                            <ArrowUpAZ className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowDownAZ className="h-4 w-4 opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {activeEmptyMessage}
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
                    <td key={getColumnId(column)} className={column.className}>
                      <div className="break-words">
                        {renderCell(row, column)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {processedRows.length > pageSize ? (
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
