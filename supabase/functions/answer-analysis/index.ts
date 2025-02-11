// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  question: string
  answer: string
  lessonContext: string
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
    
    const { question, answer, lessonContext } = body as RequestBody

    if (!question || !answer || !lessonContext) {
      console.error('Missing required fields:', { question, answer, lessonContext })
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

    const prompt = `As an expert programming tutor, analyze the student's answer to the following programming question.

Question: ${question}

Student's Answer: ${answer}

Lesson Context: ${lessonContext}

Please provide a detailed analysis in JSON format:
{
  "isCorrect": boolean,
  "score": number (0-100),
  "feedback": "Detailed explanation of what was good and what could be improved",
  "suggestions": ["List of specific suggestions for improvement"],
  "conceptsToReview": ["List of concepts the student might need to review based on their answer"]
}

Focus on being constructive and encouraging while providing specific, actionable feedback.`

    console.log('Generating analysis...')
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    })

    if (!result?.response) {
      console.error('No response from Gemini API')
      return new Response(
        JSON.stringify({
          error: 'Failed to analyze answer - no response',
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
          error: 'Failed to analyze answer - empty response',
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
      console.log('Parsing response...')
      // Try to extract JSON if there's any surrounding text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : text
      
      // Parse the JSON response
      const analysis = JSON.parse(jsonText)
      
      // Validate the required fields
      const requiredFields = ['isCorrect', 'score', 'feedback', 'suggestions', 'conceptsToReview']
      const missingFields = requiredFields.filter(field => !analysis[field])
      
      if (missingFields.length > 0) {
        console.error('Missing required fields in analysis:', missingFields)
        return new Response(
          JSON.stringify({
            error: `Generated analysis is missing required fields: ${missingFields.join(', ')}`,
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

      console.log('Successfully generated and validated analysis')
      return new Response(
        JSON.stringify({ analysis }),
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
          error: 'Failed to parse analysis response: ' + errorMessage,
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
        error: `Failed to process chat: ${errorMessage}`,
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/answer-analysis' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
