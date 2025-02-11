// Provides functions for interacting with Supabase Edge Functions.
// Currently, it defines a function to generate a study plan.

import { supabase } from './supabaseClient';

export interface Document {
  name: string;
  content: string;
}

export async function generateStudyPlan(documents: Document[]) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session found');
    }

    const { data, error } = await supabase.functions.invoke('study-plan', {
      method: 'POST',
      body: { documents },
      headers: {
        Authorization: `Bearer ${session.access_token}` // Only required headers
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw error;
    }

    console.log('Study plan data:', data);
    return data;
  } catch (error) {
    console.error('Study plan generation failed:', error);
    throw error;
  }
}