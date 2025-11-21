// tRPC Client for JobNaut Frontend
// Provides typed API client for tRPC backend

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

// Get API base URL from runtime config
const getApiBaseUrl = () => {
  if (typeof useRuntimeConfig !== 'undefined') {
    const config = useRuntimeConfig();
    return config.public.apiBase || 'http://localhost:3001/api';
  }
  return 'http://localhost:3001/api';
};

// Create tRPC client
const trpc = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: `${getApiBaseUrl()}/trpc`,
    }),
  ],
});

export default trpc;
