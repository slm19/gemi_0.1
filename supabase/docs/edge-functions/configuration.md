# Edge Functions Configuration

## File Structure

```
supabase/
├── functions/
│   └── generate-study-plan/
│       ├── index.ts           # Main function code
│       ├── deno.json         # Deno configuration
│       └── import_map.json   # Import map for dependencies
```

## Configuration Files

### deno.json
```json
{
  "compilerOptions": {
    "allowJs": true,
    "lib": ["deno.window"],
    "strict": true
  },
  "importMap": "./import_map.json",
  "tasks": {
    "start": "deno run --allow-net --allow-env index.ts",
    "deploy": "supabase functions deploy generate-study-plan"
  }
}
```

### import_map.json
```json
{
  "imports": {
    "std/": "https://deno.land/std@0.168.0/",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "openai": "https://deno.land/x/openai@v4.24.0/mod.ts"
  }
}
```

## Environment Variables

The following environment variables must be set in the Supabase dashboard or using the CLI:

1. `OPENAI_API_KEY`: Your OpenAI API key
   ```bash
   npx supabase secrets set OPENAI_API_KEY="your-key-here"
   ```

2. `SUPABASE_URL` and `SUPABASE_ANON_KEY`: Automatically set by Supabase

## CORS Configuration

The Edge Functions are configured with the following CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}
```

## Authentication

The functions require a valid JWT token in the Authorization header. The token is validated using the Supabase client:

```typescript
const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
  authHeader.replace('Bearer ', '')
)
```

## Error Handling

The functions implement comprehensive error handling for:
- Missing/invalid authentication
- Missing environment variables
- Invalid request body
- OpenAI API errors
- Invalid response format

All errors are returned with appropriate HTTP status codes and JSON error messages. 