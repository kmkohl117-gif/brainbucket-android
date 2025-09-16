import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { adaptedApiRequest, shouldUseLocalStorage } from "./storage-adapter";
import { indexedDBService } from "./indexeddb";
import { getStorageMode, logEnvironmentInfo } from "./capacitor";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Use storage adapter for routing between HTTP and local storage
  return adaptedApiRequest(method, url, data);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    
    // Initialize IndexedDB if using local storage
    if (shouldUseLocalStorage()) {
      await indexedDBService.init();
    }
    
    const res = await adaptedApiRequest('GET', url);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Initialize storage on first use
(async () => {
  if (shouldUseLocalStorage()) {
    try {
      await indexedDBService.init();
      console.log('✅ Local storage initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize local storage:', error);
    }
  }
})();

// Log environment info in development
if (import.meta.env.DEV) {
  console.log(`📊 Query Client Mode: ${shouldUseLocalStorage() ? 'Local Storage' : 'HTTP API'}`);
}
