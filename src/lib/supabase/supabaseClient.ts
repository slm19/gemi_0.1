'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uejuhelbpskiwamfeduq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlanVoZWxicHNraXdhbWZlZHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzMzI2MDgsImV4cCI6MjA1MTkwODYwOH0.-OKFJ4TIrlbaBY4M7qmbn_vRsk_Tqq4fsSwT6K_Q8I0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
}) 