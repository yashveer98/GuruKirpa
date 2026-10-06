import React, { useState } from 'react';
import {
    X, Users, UserPlus, Trash2, Shield, Package,
    Briefcase, Wrench, Mail, KeyRound, User, Loader2, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useGetStaffUsers, useCreateStaffUser, useDeleteStaffUser, type StaffUser } from '../api/staffApi';
import { useAuth, type UserRole } from '../context/AuthContext';

interface ManageStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; color: string; badge: string }> = {
    ADMIN: {
        label: 'Admin',
        icon: Shield,
        color: 'text-purple-400',
        badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    },
    STORE_KEEPER: {
        label: 'Store Keeper',
        icon: Package,
        color: 'text-blue-400',
        badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
    SALES_FINANCE: {
        label: 'Sales & Finance',
        icon: Briefcase,
        color: 'text-emerald-400',
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    LAB_TECHNICIAN: {
        label: 'Lab Tech',
        icon: Wrench,
        color: 'text-amber-400',
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
};

export const ManageStaffModal: React.FC<ManageStaffModalProps> = ({ isOpen, onClose }) => {
    const { user: currentUser } = useAuth();
    const { data: staffListRaw, isLoading, isError, refetch } = useGetStaffUsers();
    const createStaffMutation = useCreateStaffUser();
    const deleteStaffMutation = useDeleteStaffUser();

    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('STORE_KEEPER');

    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const staffList: StaffUser[] = Array.isArray(staffListRaw) ? staffListRaw : [];

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password.trim()) {
            return showToast('error', 'All fields are required');
        }

        createStaffMutation.mutate(
            { name, email, password, role },
            {
                onSuccess: () => {
                    showToast('success', `Staff account for "${name}" created!`);
                    setName('');
                    setEmail('');
                    setPassword('');
                    setRole('STORE_KEEPER');
                    setIsAdding(false);
                },
                onError: (err: any) => {
                    showToast('error', err?.response?.data?.error || 'Failed to create staff account');
                },
            }
        );
    };

    const handleDelete = (member: StaffUser) => {
        if (member.id === currentUser?.id) {
            return showToast('error', 'You cannot delete your own logged-in account!');
        }
        if (!confirm(`Are you sure you want to remove staff member "${member.name}" (${member.email})?`)) {
            return;
        }

        deleteStaffMutation.mutate(member.id, {
            onSuccess: () => showToast('success', `${member.name} removed`),
            onError: (err: any) => showToast('error', err?.response?.data?.error || 'Failed to remove user'),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed top-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        }`}
                >
                    <span>{toast.type === 'success' ? '✓' : '✗'}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                            <Users size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-100">Team & Staff Management</h2>
                            <p className="text-xs text-slate-400">Manage employee accounts and role access</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Add Staff Button / Form toggle */}
                    {!isAdding ? (
                        <div className="flex justify-between items-center bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                            <div>
                                <p className="text-sm font-semibold text-slate-200">Active Staff ({staffList.length})</p>
                                <p className="text-xs text-slate-400">Only Admins can create or remove staff credentials</p>
                            </div>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-purple-600/20"
                            >
                                <UserPlus size={15} /> Add Employee
                            </button>
                        </div>
                    ) : (
                        /* Add Employee Form */
                        <form onSubmit={handleCreate} className="bg-slate-800/80 border border-purple-500/30 rounded-xl p-4 space-y-3.5 shadow-lg">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <UserPlus size={14} /> Add New Staff Member
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="text-xs text-slate-400 hover:text-slate-200"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name *</label>
                                    <div className="relative">
                                        <User size={14} className="absolute left-3 top-2.5 text-slate-500" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Ramesh Kumar"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address *</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-3 top-2.5 text-slate-500" />
                                        <input
                                            type="email"
                                            required
                                            placeholder="employee@gurukirpa.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Initial Password *</label>
                                <div className="relative">
                                    <KeyRound size={14} className="absolute left-3 top-2.5 text-slate-500" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            {/* Role selection */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Assign Role *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['STORE_KEEPER', 'SALES_FINANCE', 'LAB_TECHNICIAN', 'ADMIN'] as UserRole[]).map((r) => {
                                        const cfg = ROLE_CONFIG[r];
                                        const Icon = cfg.icon;
                                        const isSelected = role === r;
                                        return (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setRole(r)}
                                                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${isSelected
                                                    ? `${cfg.badge} shadow-sm`
                                                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                                                    }`}
                                            >
                                                <Icon size={14} className="shrink-0" />
                                                <span className="truncate">{cfg.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={createStaffMutation.isPending}
                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2"
                                >
                                    {createStaffMutation.isPending ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} /> Create Staff Account
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Staff List Table */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">All Team Members</h4>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-purple-400" size={24} />
                            </div>
                        ) : staffList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-xs">
                                No staff members found.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/80 bg-slate-800/40 rounded-xl border border-slate-800 overflow-hidden">
                                {staffList.map((member) => {
                                    const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.STORE_KEEPER;
                                    const Icon = cfg.icon;
                                    const isSelf = member.id === currentUser?.id;

                                    return (
                                        <div
                                            key={member.id}
                                            className="p-3.5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                                                    <User size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-100 truncate flex items-center gap-1.5">
                                                        {member.name}
                                                        {isSelf && (
                                                            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-normal">
                                                                (You)
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${cfg.badge}`}
                                                >
                                                    <Icon size={12} />
                                                    {cfg.label}
                                                </span>

                                                {!isSelf && (
                                                    <button
                                                        onClick={() => handleDelete(member)}
                                                        disabled={deleteStaffMutation.isPending}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete Staff Account"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

