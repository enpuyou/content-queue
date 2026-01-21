"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface ListCounts {
  [listId: string]: number;
}

interface ListsContextType {
  listCounts: ListCounts;
  incrementListCount: (listId: string) => void;
  decrementListCount: (listId: string) => void;
  setListCount: (listId: string, count: number) => void;
  refreshListCounts: () => Promise<void>;
}

const ListsContext = createContext<ListsContextType | undefined>(undefined);

export function ListsProvider({ children }: { children: ReactNode }) {
  const [listCounts, setListCounts] = useState<ListCounts>({});

  const incrementListCount = useCallback((listId: string) => {
    setListCounts((prev) => ({
      ...prev,
      [listId]: (prev[listId] || 0) + 1,
    }));
  }, []);

  const decrementListCount = useCallback((listId: string) => {
    setListCounts((prev) => ({
      ...prev,
      [listId]: Math.max((prev[listId] || 0) - 1, 0),
    }));
  }, []);

  const setListCount = useCallback((listId: string, count: number) => {
    setListCounts((prev) => ({
      ...prev,
      [listId]: count,
    }));
  }, []);

  const refreshListCounts = useCallback(async () => {
    // This can be called to force a refresh from the API if needed
    // For now, it's a placeholder - individual pages will manage their own fetching
  }, []);

  return (
    <ListsContext.Provider
      value={{
        listCounts,
        incrementListCount,
        decrementListCount,
        setListCount,
        refreshListCounts,
      }}
    >
      {children}
    </ListsContext.Provider>
  );
}

export function useLists() {
  const context = useContext(ListsContext);
  if (context === undefined) {
    throw new Error("useLists must be used within a ListsProvider");
  }
  return context;
}
