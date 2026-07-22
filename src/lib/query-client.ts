import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";

const convexClients = new WeakMap<QueryClient, ConvexQueryClient>();
let browserQueryClient: QueryClient | undefined;

function makeQueryClient(convexUrl: string): QueryClient {
  const convexQueryClient = new ConvexQueryClient(convexUrl);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: convexQueryClient.queryFn(),
        queryKeyHashFn: convexQueryClient.hashFn(),
        staleTime: 60_000,
      },
    },
  });

  convexQueryClient.connect(queryClient);
  convexClients.set(queryClient, convexQueryClient);

  return queryClient;
}

export function getQueryClient(convexUrl: string): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient(convexUrl);
  }

  browserQueryClient ??= makeQueryClient(convexUrl);
  return browserQueryClient;
}

export function getConvexQueryClient(
  queryClient: QueryClient,
): ConvexQueryClient {
  const convexQueryClient = convexClients.get(queryClient);
  if (!convexQueryClient) {
    throw new Error("El QueryClient no fue creado por getQueryClient().");
  }
  return convexQueryClient;
}
