import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      // No automatic retries — analysis calls are expensive and long-running.
      // A timeout abort followed by an immediate retry can hit Clerk's auth
      // middleware before the token is ready, showing a confusing "Unauthorized"
      // error. Users should retry manually via the UI.
      retry: false,
    },
  },
});
