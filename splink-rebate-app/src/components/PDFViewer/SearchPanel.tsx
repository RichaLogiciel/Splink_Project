"use client";

import { useSearch } from "@embedpdf/plugin-search/react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchPanel = ({ isOpen, onClose }: SearchPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { state: searchState, provides: searchProvider } = useSearch();

  const results = searchState?.results || [];
  const currentResultIndex =
    (searchState as any)?.currentResultIndex ??
    (searchState as any)?.index ??
    -1;

  useEffect(() => {
    if (searchQuery.trim() && searchProvider) {
      (searchProvider as any)?.search?.(searchQuery) ||
        (searchProvider as any)?.query?.(searchQuery);
    } else if (searchProvider) {
      (searchProvider as any)?.clearSearch?.() ||
        (searchProvider as any)?.clear?.();
    }
  }, [searchQuery, searchProvider]);

  const handleClose = () => {
    setSearchQuery("");
    (searchProvider as any)?.clearSearch?.() ||
      (searchProvider as any)?.clear?.();
    onClose();
  };

  const handleGoToNext = () => {
    (searchProvider as any)?.goToNextResult?.() ||
      (searchProvider as any)?.nextResult?.() ||
      (searchProvider as any)?.next?.();
  };

  const handleGoToPrevious = () => {
    (searchProvider as any)?.goToPreviousResult?.() ||
      (searchProvider as any)?.previousResult?.() ||
      (searchProvider as any)?.previous?.();
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in PDF..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {results.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {currentResultIndex + 1} of {results.length}
            </span>
            <button
              onClick={handleGoToPrevious}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              aria-label="Previous Result"
              disabled={results.length === 0}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToNext}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              aria-label="Next Result"
              disabled={results.length === 0}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          aria-label="Close Search"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {searchQuery && results.length === 0 && (
        <div className="mt-2 text-sm text-gray-500">
          No results found for &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
};
