import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isAdmin as checkIsAdmin } from '@/lib/admin';

interface AdminContextType {
    isAdmin: boolean;
    user: User | null;
    isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ user, children }: { user: User | null; children: ReactNode }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            // Check env var
            const isEnvAdmin = checkIsAdmin(user.id);

            // Check database
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();

                if (!error && data) {
                    setIsAdmin(isEnvAdmin || data.is_admin || false);
                } else {
                    setIsAdmin(isEnvAdmin);
                }
            } catch (err) {
                console.error('Error checking admin status:', err);
                setIsAdmin(isEnvAdmin);
            } finally {
                setLoading(false);
            }
        };

        checkAdminStatus();
    }, [user]);

    // Don't render children until we've checked admin status to prevent potential redirects
    // BUT for better UX, we might want to render anyway and let components handle it.
    // However, AdminLayout redirects if !isAdmin, so waiting is safer to avoid flickers.
    // For now, we'll just render. The initial false might cause a redirect if on admin page?
    // AdminLayout uses useAdmin(). If we return false initially, it might redirect.
    // Let's modify the values to perhaps indicate loading? 
    // For now, simplest approach:

    return (
        <AdminContext.Provider value={{ isAdmin, user, isLoading: loading }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within AdminProvider');
    }
    return context;
};
