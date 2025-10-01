const { createClient } = require('@supabase/supabase-js');

// Hardcoded Supabase credentials from your project
const SUPABASE_URL = 'https://aaitxlxpoplreysthvrf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXR4bHhwb3BscmV5c3RodnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTYxNDUsImV4cCI6MjA3NDg3MjE0NX0.jvC1XyxEDDis38hD39UzPGu4x2llShtv65iW-Iq8qpU';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = {
  supabase,
  query: async (table, select = '*', filters = {}) => {
    let query = supabase.from(table).select(select);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    if (error) throw error;
    return { rows: data };
  },
  
  insert: async (table, data) => {
    const { data: result, error } = await supabase.from(table).insert(data);
    if (error) throw error;
    return { rows: result };
  },
  
  update: async (table, data, filters) => {
    let query = supabase.from(table).update(data);
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    const { data: result, error } = await query;
    if (error) throw error;
    return { rows: result };
  }
};