# Edge Functions Documentation

This directory contains documentation for our Supabase Edge Functions.

## Functions Overview

### 1. Generate Study Plan
- **Path**: `/functions/generate-study-plan`
- **Purpose**: Generates a structured study plan from uploaded documents using OpenAI's GPT-4
- **Authentication**: Requires valid JWT token
- **Environment Variables**:
  - `OPENAI_API_KEY`: OpenAI API key for GPT-4 access
  - `SUPABASE_URL`: Automatically set by Supabase
  - `SUPABASE_ANON_KEY`: Automatically set by Supabase

## Setup Instructions

1. Install Supabase CLI:
```bash
npm install supabase --save-dev
```

2. Deploy Functions:
```bash
npx supabase functions deploy generate-study-plan
```

3. Set Environment Variables:
```bash
npx supabase secrets set OPENAI_API_KEY="your-openai-key"
```

## Function Details

### Generate Study Plan

The function processes documents and generates a structured study plan with the following format:

```typescript
interface StudyPlan {
  chapters: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      description: string;
      keyPoints: string[];
      estimatedDuration: string;
    }>;
  }>;
}
```

#### Usage from Frontend:
```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-study-plan`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      documentContent: string,
    }),
  }
);
```

## Deployment History

- Initial deployment: January 10, 2024
- Latest update: January 10, 2024
  - Removed unsupported response_format parameter
  - Added proper JSON validation
  - Improved error handling 