/// <reference lib="deno.ns" />

// Define CORS headers to be used in edge functions
// This ensures consistency and avoids repetition

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('NODE_ENV') === 'development'
    ? 'http://localhost:3000'
    : 'https://your-production-domain.com', // Replace with your production domain, or '*' for any origin (less secure)
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, access-control-allow-methods',
  'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
}