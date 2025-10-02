import { useState, useCallback, useEffect, useRef } from 'react';

interface Column {
  id: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
}

export const useTableColumns = (initialColumns: Column[], deps: React.DependencyList = []) => {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const initialized = useRef(false);

  // Only initialize columns once or when actual column ids change
  useEffect(() => {
    const currentIds = columns.map(c => c.id).join(',');
    const newIds = initialColumns.map(c => c.id).join(',');

    if (!initialized.current || currentIds !== newIds) {
      setColumns(initialColumns);
      initialized.current = true;
    }
  }, [initialColumns.map(c => c.id).join(','), ...deps]);

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId ? { ...col, width } : col
      )
    );
  }, []);

  return { columns, handleColumnResize };
};
