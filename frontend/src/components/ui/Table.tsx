import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  dense?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ striped = false, dense = false, className = '', children, ...props }, ref) => {
    return (
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/60 shadow-sm">
        <table
          ref={ref}
          className={`w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse ${className}`}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);
Table.displayName = 'Table';

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <thead
      className={`bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold tracking-wider select-none ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <tbody className={`divide-y divide-slate-200 dark:divide-slate-800/80 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  hoverable = true,
  className = '',
  children,
  ...props
}) => {
  return (
    <tr
      className={`transition-colors duration-100 ${
        hoverable ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-default' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <th className={`px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 ${className}`} {...props}>
      {children}
    </th>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <td className={`px-4 py-3 text-slate-800 dark:text-slate-200 ${className}`} {...props}>
      {children}
    </td>
  );
};

export const TableFooter: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <tfoot
      className={`border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-medium ${className}`}
      {...props}
    >
      {children}
    </tfoot>
  );
};
