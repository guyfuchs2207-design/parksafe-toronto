import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://dxnscyuxxjlqzhdtozkj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4bnNjeXV4eGpscXpoZHRvemtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDE3MjgsImV4cCI6MjA5NDI3NzcyOH0.XMw5vx8ik_85V1322Yda_OAyMvoJe0JwoTrF9Ywl294";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});
