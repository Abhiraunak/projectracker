"use client";

import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { accessApi } from "@/lib/accessApi";
import { ALL_PERMISSIONS, type Permission } from "@/lib/access/types";

export interface AccessState {
  isAdmin: boolean;
  isLoading: boolean;
  isError: boolean;
  /** false for a new account nobody has given access yet: it only sees the welcome page */
  hasAnyAccess: boolean;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  refetch: () => void;
}

const NO_ACCESS: AccessState = {
  isAdmin: false,
  isLoading: false,
  isError: false,
  hasAnyAccess: false,
  can: () => false,
  canAny: () => false,
  refetch: () => {},
};

/**
 * What the signed-in person may do, as told by the server. Company-wide, so it is the same on every project.
 * Hiding a button is only politeness: the server refuses a forbidden request either way.
 */
/**
 * DEVELOPMENT ONLY: NEXT_PUBLIC_DEV_FULL_ACCESS=true shows every menu item, page and button without asking the
 * server (useful before /me/access exists). Ignored in a production build. The server still checks every request.
 */
const DEV_FULL_ACCESS = process.env.NEXT_PUBLIC_DEV_FULL_ACCESS === "true" && process.env.NODE_ENV !== "production";
const FULL_ACCESS = { isAdmin: true, permissions: ALL_PERMISSIONS };

export function useMyAccess(): AccessState {
  const query = useQuery({
    queryKey: ["access", "me"],
    queryFn: () => (DEV_FULL_ACCESS ? Promise.resolve(FULL_ACCESS) : accessApi.myAccess()),
    staleTime: 30_000,
  });
  const { data, isPending, isError, refetch } = query;

  return useMemo(() => {
    const granted = new Set<Permission>(data?.permissions ?? []);
    const isAdmin = data?.isAdmin ?? false;
    return {
      isAdmin,
      isLoading: isPending,
      isError,
      hasAnyAccess: isAdmin || granted.size > 0,
      can: (permission) => granted.has(permission),
      canAny: (permissions) => permissions.some((permission) => granted.has(permission)),
      refetch: () => void refetch(),
    };
  }, [data, isPending, isError, refetch]);
}

/** @deprecated access is company-wide now, so the project doesn't matter. Kept so older imports compile. */
export const useProjectAccess = (_projectId: string | null): AccessState => useMyAccess();

const AccessContext = createContext<AccessState>(NO_ACCESS);

/** The dashboard layout provides this once, so every page and the menu can ask useCan() */
export const ProjectAccessProvider = AccessContext.Provider;

export const useAccess = () => useContext(AccessContext);
export const useCan = (permission: Permission) => useContext(AccessContext).can(permission);
export const useCanAny = (permissions: Permission[]) => useContext(AccessContext).canAny(permissions);