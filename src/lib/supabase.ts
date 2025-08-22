// Simplified Supabase client for demo mode
// In production, this would connect to actual Supabase instance

export const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: (callback: any) => ({
      data: { subscription: { unsubscribe: () => {} } }
    }),
    signInWithPassword: (credentials: any) => Promise.resolve({ data: null, error: null }),
    signUp: (credentials: any) => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null })
  },
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        order: (column: string, options?: any) => Promise.resolve({ data: [], error: null })
      })
    }),
    insert: (data: any) => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null })
      })
    })
  }),
  storage: {
    from: (bucket: string) => ({
      upload: (path: string, file: File) => Promise.resolve({ data: null, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: '' } })
    })
  },
  channel: (name: string) => ({
    on: (event: string, options: any, callback: any) => ({ subscribe: () => {} })
  })
};

// Mock functions for demo
export const subscribeToReceipts = (callback: any) => ({
  unsubscribe: () => {}
});

export const uploadReceipt = async (file: File, userId: string) => {
  // Simulate upload process
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { id: Date.now().toString() };
};

export const getUserReceipts = async (userId: string) => {
  return [];
};

export const getSpendingInsights = async (userId: string) => {
  return [];
};