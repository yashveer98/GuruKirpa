import React, { useState } from 'react';
import { ShieldCheck, Mail, KeyRound, Loader2, AlertCircle, LogIn, User, Shield, Sparkles } from 'lucide-react';
import { axiosClient } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useGetSetupStatus } from '../api/staffApi';

export const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const { data: setupStatus, isLoading: isCheckingSetup } = useGetSetupStatus();

    const isInitialSetup = setupStatus?.isInitialSetup === true;

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            if (isInitialSetup) {
                // 1. First-time Master Admin creation
                await axiosClient.post('auth/register', {
                    name,
                    email,
                    password,
                    role: 'ADMIN',
                });

                setSuccessMessage('Master Admin account created! Signing you in...');

                // Automatically sign in
                const loginResponse = await axiosClient.post('auth/login', { email, password });
                const { token, user } = loginResponse.data;
                login(token, user);
            } else {
                // 2. Standard Staff / Admin Login
                const response = await axiosClient.post('auth/login', {
                    email,
                    password,
                });
                const { token, user } = response.data;
                login(token, user);
            }
        } catch (err: any) {
            setError(
                err.response?.data?.error || 'Authentication failed. Please check server connection.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
            <div className="w-full max-w-sm space-y-5">

                {/* Brand Header */}
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-100">Gurukirpa Automation</h1>
                    <p className="text-xs text-slate-400">
                        {isInitialSetup
                            ? 'Initial System Setup — Create Master Admin'
                            : 'Sign in to access industrial operations'}
                    </p>
                </div>

                {/* First Time Setup Banner */}
                {isInitialSetup && (
                    <div className="p-3.5 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-300 text-xs flex items-center gap-2.5 shadow-md">
                        <Sparkles size={18} className="shrink-0 text-purple-400" />
                        <div>
                            <p className="font-bold text-slate-100">First-Time Setup Detected</p>
                            <p className="text-[11px] text-purple-300/80">Create your initial Master Admin account. All subsequent staff accounts will be managed from your admin dashboard.</p>
                        </div>
                    </div>
                )}

                {/* Form Card */}
                <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xl">

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                            <ShieldCheck size={16} className="shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Full Name (Only required for initial setup) */}
                    {isInitialSetup && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-300">Master Admin Full Name</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3.5 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Yashveer Singh"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Email Address */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">Email Address</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                            <input
                                type="email"
                                required
                                placeholder="admin@gurukirpa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-300">Password</label>
                        <div className="relative">
                            <KeyRound size={16} className="absolute left-3.5 top-3 text-slate-500" />
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || isCheckingSetup}
                        className={`w-full py-3 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 mt-3 disabled:opacity-50 ${isInitialSetup
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/10'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Processing...
                            </>
                        ) : isInitialSetup ? (
                            <>
                                <Shield size={16} /> Create Master Admin & Enter
                            </>
                        ) : (
                            <>
                                <LogIn size={16} /> Sign In
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Notice */}
                <div className="text-center">
                    <p className="text-[11px] text-slate-500">
                        Protected internal system. Staff accounts are provisioned exclusively by system administrators.
                    </p>
                </div>
            </div>
        </div>
    );
};
