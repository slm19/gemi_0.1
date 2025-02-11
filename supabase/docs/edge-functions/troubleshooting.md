# Edge Functions Troubleshooting Guide

## Common Issues and Solutions

### 1. 401 Unauthorized Error
```
Error: 401 Unauthorized
```

**Possible Causes:**
- Invalid or expired JWT token
- Missing Authorization header
- Incorrect token format

**Solutions:**
1. Check if the user is logged in
2. Ensure the Authorization header is set correctly:
```typescript
headers: {
  'Authorization': `Bearer ${session.access_token}`,
}
```
3. Verify the token is not expired using Supabase Auth UI

### 2. OpenAI API Errors
```
Error: OpenAI API key not configured
```

**Solutions:**
1. Check if the API key is set:
```bash
npx supabase secrets list
```
2. Set the API key if missing:
```bash
npx supabase secrets set OPENAI_API_KEY="your-key-here"
```

### 3. Invalid JSON Response
```
Error: Failed to generate valid study plan format
```

**Possible Causes:**
- OpenAI response not in correct format
- Parsing error in response

**Solutions:**
1. Check the system prompt in the Edge Function
2. Verify the response validation logic
3. Increase max_tokens if response is truncated

### 4. Deployment Issues
```
Error: failed to parse import map
```

**Solutions:**
1. Verify import_map.json syntax
2. Check if all dependencies are accessible
3. Try redeploying with debug flag:
```bash
npx supabase functions deploy generate-study-plan --debug
```

### 5. CORS Issues
```
Access to fetch blocked by CORS policy
```

**Solutions:**
1. Verify corsHeaders in the Edge Function:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
```
2. Check if OPTIONS requests are handled correctly
3. Ensure the request includes the correct headers

## Debugging Tips

1. Enable debug logging:
```typescript
console.error('Error details:', {
  error,
  request: {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url,
  },
});
```

2. Check function logs in Supabase dashboard:
   - Navigate to Edge Functions
   - Select the function
   - Click on "Logs" tab

3. Test locally using Supabase CLI:
```bash
npx supabase start
npx supabase functions serve generate-study-plan
```

## Support Resources

1. [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
2. [Deno Deploy Documentation](https://deno.com/deploy/docs)
3. [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
4. [Supabase Discord Community](https://discord.supabase.com) 