import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastProvider, Toast, ToastTitle, ToastDescription, ToastViewport, ToastClose } from './Toast';

interface ForgotPasswordProps {
    onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [toast, setToast] = useState<{ title: string; description: string; variant: 'success' | 'error' } | null>(null);

    const showToast = (title: string, description: string, variant: 'success' | 'error') => {
        setToast({ title, description, variant });
        setTimeout(() => setToast(null), 5000);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            showToast('Error', error.message, 'error');
        } else {
            showToast(
                'Success',
                'Password reset email sent! Please check your inbox.',
                'success'
            );
            setEmail('');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
            <ToastProvider>
                <div className="bg-white p-8 rounded-xl shadow-lg w-96">
                    <button
                        onClick={onBack}
                        className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition"
                    >
                        <svg
                            className="w-5 h-5 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        Back to Sign In
                    </button>

                    <h1 className="text-2xl font-bold text-center mb-2">Forgot Password</h1>
                    <p className="text-gray-600 text-center mb-6">
                        Enter your email and we'll send you a link to reset your password
                    </p>

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter your email"
                                required
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
                                'Send Reset Link'
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
