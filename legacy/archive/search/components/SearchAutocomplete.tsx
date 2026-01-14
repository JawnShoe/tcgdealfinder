// ARCHIVED: replaced by rebuild lane – do not import
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 200;

export type CardSuggestion = {
  id: number;
  name: string;
  setName: string;
  cardNumber: string | null;
};

export function SearchAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setSuggestions([]);
      closeDropdown();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search-cards?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const data = (await res.json()) as CardSuggestion[];
        setSuggestions(data);
        setIsOpen(data.length > 0);
        setHighlightedIndex(data.length > 0 ? 0 : -1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("search autocomplete failure", error);
        }
        setSuggestions([]);
        closeDropdown();
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, closeDropdown]);

  const handleNavigate = useCallback(
    (suggestion: CardSuggestion) => {
      closeDropdown();
      setSuggestions([]);
      router.push(`/cards/${suggestion.id}`);
    },
    [closeDropdown, router]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const suggestion =
      highlightedIndex >= 0 ? suggestions[highlightedIndex] : null;
    if (suggestion) {
      event.preventDefault();
      handleNavigate(suggestion);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => {
        if (prev <= 0) {
          return suggestions.length - 1;
        }
        return prev - 1;
      });
    } else if (event.key === "Enter") {
      const suggestion =
        highlightedIndex >= 0 ? suggestions[highlightedIndex] : null;
      if (suggestion) {
        event.preventDefault();
        handleNavigate(suggestion);
      }
    } else if (event.key === "Escape") {
      closeDropdown();
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      closeDropdown();
    }, 120);
  };

  return (
    <form
      method="GET"
      action="/search"
      className="relative flex flex-col gap-1"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search cards..."
          autoComplete="off"
          className="w-44 rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none sm:w-60"
        />
        <button
          type="submit"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Search
        </button>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <ul role="listbox">
            {suggestions.map((suggestion, index) => {
              const isActive = index === highlightedIndex;
              return (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                      isActive
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700"
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleNavigate(suggestion)}
                  >
                    <span className="font-medium">{suggestion.name}</span>
                    <span className="text-xs text-slate-500">
                      {suggestion.setName}
                      {suggestion.cardNumber
                        ? ` · ${suggestion.cardNumber}`
                        : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {isLoading && <span className="text-xs text-slate-400">Searching…</span>}
    </form>
  );
}
