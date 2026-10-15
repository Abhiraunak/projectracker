"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DrawingListParams, DrawingScope } from "@/lib/drawings/types";
import { useDebounced } from "./useDebounced";

/** Which slice of the gallery is on screen: tab, search text and page number */
export function useGalleryFilters(pageSize = 8) {
  const [scope, setScopeState] = useState<DrawingScope>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useDebounced(search.trim(), 300);

  useEffect(() => setPage(1), [query]); // a new search starts on page 1

  const setScope = useCallback((next: DrawingScope) => {
    setScopeState(next);
    setPage(1);
  }, []);

  const params = useMemo<DrawingListParams>(
    () => ({ scope, q: query || undefined, page, pageSize }),
    [scope, query, page, pageSize]
  );

  return { params, scope, search, setSearch, setScope, setPage };
}
