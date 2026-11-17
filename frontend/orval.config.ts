import { defineConfig } from 'orval'

export default defineConfig({
  openGym: {
    input: { target: '../api/openapi.json' },
    output: {
      target: './src/generated/api.ts',
      schemas: './src/generated/models',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      urlEncodeParameters: true,
      override: {
        mutator: { path: './src/lib/api-client.ts', name: 'apiClient' },
        fetch: { includeHttpResponseReturnType: false },
        query: { signal: true },
      },
    },
  },
})
