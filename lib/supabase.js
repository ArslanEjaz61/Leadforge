import { createClient } from '@supabase/supabase-js';

// Server-side only client (service_role key never reaches the browser —
// this module is only imported from API routes / getServerSideProps).
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
