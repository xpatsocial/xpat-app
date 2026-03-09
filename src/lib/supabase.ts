import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://diiqponrvrcpwoerenwz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpaXFwb25ydnJjcHdvZXJlbnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODI4ODMsImV4cCI6MjA4ODU1ODg4M30.3rkaz6nZC_2_3UsHQNd07PnFoBkypBwstBeH7lr6wPQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
