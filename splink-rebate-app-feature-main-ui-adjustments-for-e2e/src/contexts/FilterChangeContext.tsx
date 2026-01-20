"use client";
import React, { createContext, useCallback, useContext, useState } from "react";

interface FilterChangeContextType {
  isFilterChanging: boolean;
  setFilterChanging: (changing: boolean) => void;
}

const FilterChangeContext = createContext<FilterChangeContextType | undefined>(
  undefined
);

export function FilterChangeProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [isFilterChanging, setIsFilterChanging] = useState(false);

  const setFilterChanging = useCallback((changing: boolean) => {
    setIsFilterChanging(changing);
  }, []);

  return (
    <FilterChangeContext.Provider
      value={{ isFilterChanging, setFilterChanging }}
    >
      {children}
    </FilterChangeContext.Provider>
  );
}

export function useFilterChange() {
  const context = useContext(FilterChangeContext);
  if (context === undefined) {
    throw new Error(
      "useFilterChange must be used within a FilterChangeProvider"
    );
  }
  return context;
}
