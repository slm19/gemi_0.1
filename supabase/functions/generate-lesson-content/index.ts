// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { corsHeaders } from '../_shared/cors.ts';

console.log("Hello from Functions!")

interface RequestBody {
  lessonTitle: string
  lessonDescription: string
  keyPoints: string[]
}

serve(async (req: Request) => {
  console.log('Function invoked with method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    console.log('Parsing request body...')
    const body = await req.json()
    console.log('Request body:', JSON.stringify(body))
    
    const { lessonTitle, lessonDescription, keyPoints } = body as RequestBody

    if (!lessonTitle || !lessonDescription || !keyPoints) {
      console.error('Missing required fields:', { lessonTitle, lessonDescription, keyPoints })
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    // Initialize Google AI
    console.log('Initializing Gemini API...')
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables')
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }
    
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    console.log('Gemini API initialized successfully')

    console.log('Generating content for lesson:', lessonTitle)
    const prompt = `You are a professional programming tutor. Generate a detailed lesson content for a programming tutorial.
The lesson title is "${lessonTitle}", the description is "${lessonDescription}", and the key points to cover are: ${keyPoints.join(', ')}.

Your response must be a valid JSON object with exactly this structure:
{
  "title": "The lesson title",
  "content": "The main lesson content with detailed explanations",
  "objectives": ["List of specific learning objectives"],
  "examples": [
    {
      "title": "Example title",
      "code": "Code snippet if applicable",
      "explanation": "Explanation of the example"
    }
  ],
  "exercises": [
    {
      "question": "Practice question",
      "hint": "Optional hint for the exercise"
    }
  ],
  "summary": "A concise summary of the key points covered"
}

Important: 
1. Ensure your response is ONLY the JSON object, with no additional text before or after
2. Make the content engaging, clear, and focused on practical understanding
3. Include relevant code examples where appropriate
4. All JSON fields are required`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 4096,
      },
    })
    console.log('Content generation completed')

    if (!result?.response) {
      console.error('No response from Gemini API')
      return new Response(
        JSON.stringify({
          error: 'Failed to generate lesson content - no response',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    const text = await result.response.text()
    console.log('Response text length:', text?.length || 0)

    if (!text) {
      console.error('Empty response text from Gemini API')
      return new Response(
        JSON.stringify({
          error: 'Failed to generate lesson content - empty response',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    try {
      console.log('Parsing and validating response...')
      // Try to extract JSON if there's any surrounding text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : text
      
      // Parse the JSON response
      const lessonContent = JSON.parse(jsonText)
      
      // Validate the required fields
      const requiredFields = ['title', 'content', 'objectives', 'examples', 'exercises', 'summary']
      const missingFields = requiredFields.filter(field => !lessonContent[field])
      
      if (missingFields.length > 0) {
        console.error('Missing required fields in generated content:', missingFields)
        return new Response(
          JSON.stringify({
            error: `Generated content is missing required fields: ${missingFields.join(', ')}`,
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      }

      console.log('Successfully generated and validated lesson content')
      return new Response(
        JSON.stringify({ lessonContent }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error parsing response:', errorMessage)
      return new Response(
        JSON.stringify({
          error: 'Failed to parse lesson content response: ' + errorMessage,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Function error:', errorMessage)
    return new Response(
      JSON.stringify({
        error: `Failed to generate lesson content: ${errorMessage}`,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-lesson-content' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
