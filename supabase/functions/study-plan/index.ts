// functions/study-plan/index.ts
// @deno-types="https://deno.land/std@0.168.0/http/server.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { corsHeaders } from '../_shared/cors.ts'; // Import CORS headers

console.log("Study Plan Function Started")

serve(async (req: Request) => {
  // 1. Handle OPTIONS (Preflight) - SIMPLIFIED
  if (req.method === 'OPTIONS') {
    console.log("OPTIONS request received"); // Add this log
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { documents } = await req.json()

    if (!documents || !Array.isArray(documents)) {
      throw new Error('Invalid request body: documents array is required')
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '')
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Prepare the content for analysis
    const combinedContent = documents.map(doc => doc.content).join('\n\n')

    // Generate study plan using Gemini
    const prompt = `Create a structured study plan from these documents: ${combinedContent}

    Return ONLY a valid JSON object (no markdown, no \`\`\`json tags) using this exact structure:
    {
      "chapters": [
        {
          "title": "Chapter title",
          "description": "Chapter description",
          "lessons": [
            {
              "title": "Lesson title",
              "description": "Lesson description",
              "keyPoints": ["key point 1", "key point 2"],
              "estimatedDuration": "30 mins"
            }
          ]
        }
      ]
    }

    Important: 
    1. Do NOT include any markdown formatting or code block tags
    2. The response must be ONLY the JSON object
    3. Ensure it is valid JSON that can be parsed`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Clean up the response text
      const cleanText = text
        .replace(/```json/g, '') // Remove ```json
        .replace(/```/g, '')     // Remove remaining ```
        .trim();                 // Remove extra whitespace
      
      console.log('Cleaned response:', cleanText);
      
      // Parse and validate the response
      const studyPlan = JSON.parse(cleanText);
      
      if (!studyPlan.chapters || !Array.isArray(studyPlan.chapters)) {
        throw new Error('Invalid study plan format: missing chapters array');
      }

      const responseData = new Response(JSON.stringify(studyPlan), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders // Include CORS headers in the main response
        }
      });
      
      return responseData;

    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('Failed to parse study plan response');
    }

  } catch (err) {
    const error = err as Error;
    console.error('Error:', error);
    
    const errorResponse = new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'error'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders // Include CORS headers in the error response
        }
      }
    );

    return errorResponse;
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/study-plan' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/