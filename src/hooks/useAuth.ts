import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial auth check
    const checkAuth = async () => {
      try {
        // Check if user was previously logged in (demo mode)
        const savedUser = localStorage.getItem('demo_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signInDemo = async () => {
    const demoUser: User = {
      id: 'demo-user-123',
      email: 'demo@example.com',
      user_metadata: { name: 'Demo User' }
    };
    
    setUser(demoUser);
    localStorage.setItem('demo_user', JSON.stringify(demoUser));
    return { data: { user: demoUser }, error: null };
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('demo_user');
    return { error: null };
  };

  return {
    user,
    loading,
    signInDemo,
    signOut
  };
};