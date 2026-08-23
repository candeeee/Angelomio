import { ReactNode } from "react";

export interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No hay datos para mostrar.",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="card-surface p-10 text-center text-sm text-warmgray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead>
          <tr className="border-b border-warmgray-100 text-[10px] uppercase tracking-editorial text-warmgray-500">
            {columns.map((col) => (
              <th key={col.header} className="px-5 py-3 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="border-b border-warmgray-100 transition-colors last:border-0 hover:bg-beige-50">
              {columns.map((col) => (
                <td key={col.header} className={`px-5 py-3.5 ${col.className ?? ""}`}>
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
