/**
 * Admin utilities for checking admin status
 * 
 * For development: Add user IDs to VITE_ADMIN_USER_IDS in .env.local
 * Example: VITE_ADMIN_USER_IDS=uuid-1,uuid-2,uuid-3
 * 
 * For production: Use database is_admin column (requires migration)
 */

export const isAdmin = (userId: string): boolean => {
    const adminIds = import.meta.env.VITE_ADMIN_USER_IDS?.split(',').map((id: string) => id.trim()) || [];
    return adminIds.includes(userId);
};

export const getAdminUserIds = (): string[] => {
    return import.meta.env.VITE_ADMIN_USER_IDS?.split(',').map((id: string) => id.trim()) || [];
};
