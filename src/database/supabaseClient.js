import { createClient } from "@supabase/supabase-js";

export const supabase = createClient('https://lgxaznpmgtsrymvpfkdx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneGF6bnBtZ3RzcnltdnBma2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MzU1OTQsImV4cCI6MjA2NDUxMTU5NH0.giDoVnvU89JzHTE0HVSYir6j94nSqWJFGwNjzWI5-qM', {
  global: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  storage: {
    uploadTimeout: 30000,
  }
});
