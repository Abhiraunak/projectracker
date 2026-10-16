import { ApiError, describeError } from "@/lib/api";

/** A failed load, with a retry button (not offered when the problem is an expired session) */
export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const expired = error instanceof ApiError && error.status === 401;
  return (
    <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>{describeError(error)}</p>
      {onRetry && !expired && (
        <button type="button" onClick={onRetry} className="mt-2 font-medium underline">
          Try again
        </button>
      )}
    </div>
  );
}
