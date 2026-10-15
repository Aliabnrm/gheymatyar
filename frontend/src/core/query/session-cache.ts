import type { QueryClient } from "@tanstack/react-query";
import { advanceAuthSessionEpoch } from "@/core/api/auth-session-event";

const generations = new WeakMap<QueryClient, number>();

export function sessionGeneration(client: QueryClient): number {
  return generations.get(client) ?? 0;
}

/** Invalidate in-flight work before removing all authenticated workspace data. */
export function clearSessionCache(client: QueryClient): void {
  advanceAuthSessionEpoch();
  generations.set(client, sessionGeneration(client) + 1);
  void client.cancelQueries();
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
  const cache = client.getMutationCache();
  for (const mutation of cache.getAll()) {
    if (mutation.options.mutationKey?.[0] !== "auth") cache.remove(mutation);
  }
}
