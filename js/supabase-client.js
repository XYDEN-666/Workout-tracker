// js/supabase-client.js
const SUPABASE_URL = 'https://bxzwyqsqacdlneznmfax.supabase.co';         // <-- PASTE YOUR URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4end5cXNxYWNkbG5lem5tZmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MzUxNTQsImV4cCI6MjA2NDUxMTE1NH0.pdG_f_4gwOwjZ5d_Tf0lqpdD5AW37l5yD_EmgXHBc50'; // <-- PASTE YOUR KEY

// The Supabase CDN script (supabase-js@2) makes a global object named 'supabase' available.
// This global 'supabase' object contains the createClient function.
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("Supabase client (sbClient) initialized in supabase-client.js:", sbClient);

// If you absolutely need the variable to be called `supabase` in other files
// without changing them, you could do:
// window.myAppSupabaseClient = sbClient; // And then app.js uses window.myAppSupabaseClient
// Or, if you are sure about the scope and load order, and no other script defines `supabase`
// before app.js runs, you could try to "export" sbClient as supabase, but that's hacky.
// The best is to use `sbClient` consistently.