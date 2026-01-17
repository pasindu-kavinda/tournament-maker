import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ToastProvider, Toast, ToastTitle, ToastDescription, ToastViewport, ToastClose } from '../components/Toast';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [toast, setToast] = useState<{ title: string; description: string; variant: 'success' | 'error' } | null>(null);
    const [isValidToken, setIsValidToken] = useState(false);

    useEffect(() => {
        // Check if there's a valid session from the reset link
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setIsValidToken(true);
            } else {
                showToast('Error', 'Invalid or expired reset link', 'error');
                setTimeout(() => navigate('/'), 3000);
            }
        });
    }, [navigate]);

    const showToast = (title: string, description: string, variant: 'success' | 'error') => {
        setToast({ title, description, variant });
        setTimeout(() => setToast(null), 5000);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            showToast('Error', 'Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Error', 'Password must be at least 6 characters long', 'error');
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            showToast('Error', error.message, 'error');
            setLoading(false);
        } else {
            showToast('Success', 'Password updated successfully! Redirecting...', 'success');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }
    };

    if (!isValidToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                <ToastProvider>
                    <div className="bg-white p-8 rounded-xl shadow-lg w-96">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
                        </div>
                    </div>
                    {toast && (
                        <Toast className="bg-red-50">
                            <div className="grid gap-1">
                                <ToastTitle className="text-red-900">{toast.title}</ToastTitle>
                                <ToastDescription className="text-red-700">{toast.description}</ToastDescription>
                            </div>
                            <ToastClose />
                        </Toast>
                    )}
                    <ToastViewport />
                </ToastProvider>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
            <ToastProvider>
                <div className="bg-white p-8 rounded-xl shadow-lg w-96">
                    <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
                    <p className="text-gray-600 text-center mb-6">
                        Enter your new password below
                    </p>

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter new password"
                                required
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Confirm new password"
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                </div>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>
                </div>

                {toast && (
                    <Toast className={`${toast.variant === 'success' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                        <div className="grid gap-1">
                            <ToastTitle className={`${toast.variant === 'success' ? 'text-green-900' : 'text-red-900'
                                }`}>
                                {toast.title}
                            </ToastTitle>
                            <ToastDescription className={`${toast.variant === 'success' ? 'text-green-700' : 'text-red-700'
                                }`}>
                                {toast.description}
                            </ToastDescription>
                        </div>
                        <ToastClose />
                    </Toast>
                )}
                <ToastViewport />
            </ToastProvider>
        </div>
    );
}
