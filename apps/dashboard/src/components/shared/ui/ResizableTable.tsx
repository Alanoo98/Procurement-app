import React, { useState, useRef, useEffect } from 'react';

interface Column {
  id: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
}

interface ResizableTableProps {
  children: React.ReactNode;
  columns: Column[];
  onColumnResize: (columnId: string, width: number) => void;
  className?: string;
}

export const ResizableTable: React.FC<ResizableTableProps> = ({
  children,
  columns,
  onColumnResize,
  className = '',
}) => {
  const [resizing, setResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;

      const column = columns.find(col => col.id === resizing);
      if (!column) return;

      const deltaX = e.clientX - startX;
      const minWidth = column.minWidth || 60;
      const maxWidth = column.maxWidth || 800;
      const newWidth = Math.min(Math.max(startWidth + deltaX, minWidth), maxWidth);

      onColumnResize(resizing, newWidth);
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, startX, startWidth, columns, onColumnResize]);

  const startResize = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    setResizing(columnId);
    setStartX(e.clientX);
    setStartWidth(column.width);
  };

  return (
    <div className="relative overflow-x-auto w-full">
      <div
        className="min-w-full"
        style={{
          width: `${columns.reduce((sum, col) => sum + col.width, 0)}px`
        }}
      >
        <table
          ref={tableRef}
          className={`table-fixed w-full ${className}`}
          style={{ tableLayout: 'fixed' }}
        >
          {React.Children.map(children, child => {
            if (!React.isValidElement(child)) return child;

            if (child.type === 'thead') {
              return React.cloneElement(child, {
                children: React.Children.map(child.props.children, row => {
                  if (!React.isValidElement(row)) return row;
                  return React.cloneElement(row, {
                    children: React.Children.map(row.props.children, (cell, index) => {
                      if (!React.isValidElement(cell)) return cell;
                      const column = columns[index];
                      if (!column) return cell;

                      return (
                        <th
                          {...cell.props}
                          style={{
                            width: column.width,
                            minWidth: column.minWidth || column.width,
                            maxWidth: column.maxWidth || column.width,
                            position: 'relative'
                          }}
                          className={`${cell.props.className || ''} select-none border-r border-gray-200 last:border-r-0`}
                        >
                          <div className="flex items-center justify-between h-full pr-2">
                            <div className="content-wrapper truncate flex-shrink-0 min-w-0">
                              {cell.props.children}
                            </div>
                            <div
                              className="w-2 h-full cursor-col-resize hover:bg-emerald-200"
                              onMouseDown={(e) => startResize(column.id, e)}
                              style={{ position: 'absolute', right: 0, top: 0, bottom: 0 }}
                            />
                          </div>
                        </th>
                      );
                    })
                  });
                })
              });
            }

            if (child.type === 'tbody') {
              return React.cloneElement(child, {
                children: React.Children.map(child.props.children, row => {
                  if (!React.isValidElement(row)) return row;
                  return React.cloneElement(row, {
                    children: React.Children.map(row.props.children, (cell, index) => {
                      if (!React.isValidElement(cell)) return cell;
                      const column = columns[index];
                      if (!column) return cell;

                      return React.cloneElement(cell, {
                        style: {
                          width: column.width,
                          minWidth: column.minWidth || column.width,
                          maxWidth: column.maxWidth || column.width
                        },
                        className: `${cell.props.className || ''} whitespace-nowrap overflow-hidden text-ellipsis px-4 py-2`,
                        children: (
                          <div className="content-wrapper flex items-center gap-2 overflow-hidden text-ellipsis">
                            {cell.props.children}
                          </div>
                        )
                      });
                    })
                  });
                })
              });
            }

            return child;
          })}
        </table>
      </div>
    </div>
  );
};

