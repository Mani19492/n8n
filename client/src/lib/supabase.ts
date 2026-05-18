import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://symwxamdwoouyzmlfahr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bXd4YW1kd29vdXl6bWxmYWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MjU1MTQsImV4cCI6MjA5NDQwMTUxNH0.44sr9wU6j7rYer7REayxsgQqU7n_6tXu_yXpz-Lz288';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return data;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
