"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

/**
 * Collections — named groups of saved portfolios.
 *
 * Stored in localStorage. Each collection has:
 * - id: unique identifier
 * - name: user-provided name
 * - itemIds: array of portfolio IDs
 * - createdAt: timestamp
 */

interface Collection {
  id: string;
  name: string;
  itemIds: string[];
  createdAt: number;
}

interface CollectionsContextType {
  collections: Collection[];
  createCollection: (name: string) => Collection;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  addItemToCollection: (collectionId: string, itemId: string) => void;
  removeItemFromCollection: (collectionId: string, itemId: string) => void;
  isInCollection: (collectionId: string, itemId: string) => boolean;
  getCollectionsForItem: (itemId: string) => Collection[];
}

const CollectionsContext = createContext<CollectionsContextType | null>(null);

const STORAGE_KEY = "foliomuse-collections";

function loadCollections(): Collection[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCollections(collections: Collection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
}

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    setCollections(loadCollections());
  }, []);

  const createCollection = useCallback((name: string) => {
    const newCollection: Collection = {
      id: crypto.randomUUID(),
      name,
      itemIds: [],
      createdAt: Date.now(),
    };
    setCollections((prev) => {
      const next = [...prev, newCollection];
      saveCollections(next);
      return next;
    });
    return newCollection;
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveCollections(next);
      return next;
    });
  }, []);

  const renameCollection = useCallback((id: string, name: string) => {
    setCollections((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, name } : c));
      saveCollections(next);
      return next;
    });
  }, []);

  const addItemToCollection = useCallback((collectionId: string, itemId: string) => {
    setCollections((prev) => {
      const next = prev.map((c) => {
        if (c.id !== collectionId) return c;
        if (c.itemIds.includes(itemId)) return c;
        return { ...c, itemIds: [...c.itemIds, itemId] };
      });
      saveCollections(next);
      return next;
    });
  }, []);

  const removeItemFromCollection = useCallback((collectionId: string, itemId: string) => {
    setCollections((prev) => {
      const next = prev.map((c) => {
        if (c.id !== collectionId) return c;
        return { ...c, itemIds: c.itemIds.filter((id) => id !== itemId) };
      });
      saveCollections(next);
      return next;
    });
  }, []);

  const isInCollection = useCallback(
    (collectionId: string, itemId: string) => {
      const collection = collections.find((c) => c.id === collectionId);
      return collection ? collection.itemIds.includes(itemId) : false;
    },
    [collections],
  );

  const getCollectionsForItem = useCallback(
    (itemId: string) => {
      return collections.filter((c) => c.itemIds.includes(itemId));
    },
    [collections],
  );

  return (
    <CollectionsContext.Provider
      value={{
        collections,
        createCollection,
        deleteCollection,
        renameCollection,
        addItemToCollection,
        removeItemFromCollection,
        isInCollection,
        getCollectionsForItem,
      }}
    >
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollections() {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error("useCollections must be used within CollectionsProvider");
  }
  return context;
}
