"use client";

import { useQueryClient } from "@tanstack/react-query";

/**
 * Orders, deliveries and stock entries all feed each other (a delivery changes the order, an order changes
 * the shortage figure), so after any change every one of these lists is reloaded.
 */
export function useRefreshMaterials() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["requirements"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["movements"] }),
    ]);
}
