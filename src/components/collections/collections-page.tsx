"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Check, X, FolderOpen } from "lucide-react";
import Link from "next/link";

import { useCollections } from "@/lib/collections";
import { GalleryCard } from "@/components/gallery-card";
import { useGalleryQuery } from "@/hooks/use-gallery-query";

/**
 * Collections page — manage named groups of saved portfolios.
 */

export function CollectionsPage() {
  const { collections, createCollection, deleteCollection, renameCollection } = useCollections();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeCollection = collections.find((c) => c.id === activeId);

  function handleCreate() {
    if (!newName.trim()) return;
    createCollection(newName.trim());
    setNewName("");
  }

  function handleStartEdit(collection: { id: string; name: string }) {
    setEditingId(collection.id);
    setEditName(collection.name);
  }

  function handleSaveEdit() {
    if (editingId && editName.trim()) {
      renameCollection(editingId, editName.trim());
    }
    setEditingId(null);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar — Collection list */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Collections</h3>

          {/* Create new */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New collection name"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Collection list */}
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No collections yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                    activeId === collection.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {editingId === collection.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="rounded p-1 text-green-500 hover:bg-muted"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveId(collection.id)}
                        className="flex flex-1 items-center gap-2 text-left text-sm"
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span className="flex-1 truncate">{collection.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {collection.itemIds.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(collection)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCollection(collection.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content — Collection items */}
      <div>
        {activeCollection ? (
          <CollectionItems collection={activeCollection} />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
            <p className="text-muted-foreground">Select a collection to view items</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionItems({ collection }: { collection: { id: string; name: string; itemIds: string[] } }) {
  const { removeItemFromCollection } = useCollections();

  if (collection.itemIds.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
        <div className="text-center">
          <p className="font-display text-lg font-medium">No items yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add portfolios from the gallery using the bookmark button.
          </p>
          <Link
            href="/browse"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse portfolios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {collection.itemIds.map((itemId) => (
        <CollectionItemCard
          key={itemId}
          itemId={itemId}
          onRemove={() => removeItemFromCollection(collection.id, itemId)}
        />
      ))}
    </div>
  );
}

function CollectionItemCard({ itemId, onRemove }: { itemId: string; onRemove: () => void }) {
  // Fetch item details
  const { items } = useGalleryQuery({ pageSize: 100 });
  const item = items.find((i) => i.id === itemId);

  if (!item) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <span className="text-sm text-muted-foreground">Portfolio not found</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <GalleryCard item={item} />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-destructive"
        aria-label="Remove from collection"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
