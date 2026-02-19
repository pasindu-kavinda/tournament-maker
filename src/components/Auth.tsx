import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ToastProvider, Toast, ToastTitle, ToastDescription, ToastViewport, ToastClose } from './Toast';
import ForgotPassword from './ForgotPassword';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [toast, setToast] = useState<{ title: string; description: string; variant: 'success' | 'error' } | null>(null);

  const showToast = (title: string, description: string, variant: 'success' | 'error') => {
    setToast({ title, description, variant });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          gender: gender || null
        }
      }
    });

    if (error) {
      showToast('Error', error.message, 'error');
      setLoading(false);
    } else if (data.user) {
      if (data.user.identities && data.user.identities.length === 0) {
        showToast('Info', 'This email is already registered. Please sign in instead.', 'error');
        setIsSignUp(false);
      } else if (data.session) {
        showToast('Success', 'Account created successfully! Welcome!', 'success');
      } else {
        showToast('Success', 'Account created! Please check your email to confirm your account.', 'success');
        setIsSignUp(false);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showToast('Error', error.message, 'error');
    }
    setLoading(false);
  };

  if (isForgotPassword) {
    return <ForgotPassword onBack={() => setIsForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
      <ToastProvider>
        <div className="bg-white p-8 rounded-xl shadow-lg w-96">
          <h1 className="text-2xl font-bold text-center mb-6">Tournament Maker</h1>

          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${!isSignUp
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${isSignUp
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border cursor-pointer transition ${gender === 'male'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={gender === 'male'}
                      onChange={() => setGender('male')}
                      className="sr-only"
                    />
                    ♂ Male
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border cursor-pointer transition ${gender === 'female'
                      ? 'bg-pink-50 border-pink-500 text-pink-700 font-semibold'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={gender === 'female'}
                      onChange={() => setGender('female')}
                      className="sr-only"
                    />
                    ♀ Female
                  </label>
                </div>
              </div>
            )}

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your password"
                required
              />
            </div>

            {!isSignUp && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                </div>
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
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