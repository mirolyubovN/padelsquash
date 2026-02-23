interface AdminTableProps {
  columns: string[];
  rows: string[][];
}

export function AdminTable({ columns, rows }: AdminTableProps) {
  return (
    <div className="admin-table">
      <table className="admin-table__table">
        <thead className="admin-table__head">
          <tr className="admin-table__row">
            {columns.map((column) => (
              <th key={column} className="admin-table__cell admin-table__cell--head" scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="admin-table__body">
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row.join("-")}`} className="admin-table__row">
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="admin-table__cell">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
