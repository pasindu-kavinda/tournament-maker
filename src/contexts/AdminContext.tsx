import { createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { isAdmin as checkIsAdmin } from '@/lib/admin';

interface AdminContextType {
    isAdmin: boolean;
    user: User | null;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ user, children }: { user: User | null; children: ReactNode }) => {
    const isAdmin = user ? checkIsAdmin(user.id) : false;

    return (
        <AdminContext.Provider value={{ isAdmin, user }}>
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
