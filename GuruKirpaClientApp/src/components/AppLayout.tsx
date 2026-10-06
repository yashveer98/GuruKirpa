import React, { useState, useMemo } from 'react';
import {
    Layers, ShoppingBag, FileText, Wrench, AlertTriangle,
    LogOut, ChevronLeft, ChevronRight, User, Zap,
    Menu, X, Shield, Package, Factory, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGetLowStockProducts } from '../api/productsApi';
import { useGetRepairs } from '../api/repairsApi';
import { ManageStaffModal } from './ManageStaffModal';

export type NavTab = 'table' | 'inventory' | 'pos' | 'orders' | 'repairs' | 'low-stock' | 'panels';

interface AppLayoutProps {
    activeTab: NavTab;
    setActiveTab: (tab: NavTab) => void;
    children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
    activeTab,
    setActiveTab,
    children,
}) => {
    const { user, isAdmin, isStoreKeeper, isSalesFinance, isLabTech, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

    // Live Badge Queries
    const { data: lowStockData } = useGetLowStockProducts(5);
    const lowStockCount = Array.isArray(lowStockData) ? lowStockData.length : 0;

    const { data: repairsData } = useGetRepairs();
    const activeRepairsCount = useMemo(() => {
        if (!Array.isArray(repairsData)) return 0;
        return repairsData.filter(
            (r) => !['DELIVERED', 'SCRAP', 'UNREPAIRABLE_RETURN'].includes(r.status)
        ).length;
    }, [repairsData]);

    const allNavItems = [
        {
            key: 'table' as NavTab,
            label: isStoreKeeper || isAdmin ? 'Inventory & Store' : 'Store Catalog (Read-Only)',
            icon: Package,
            badge: null,
            badgeColor: '',
            visible: true, // Everyone has store visibility (read-only for Sales & Lab)
        },
        {
            key: 'pos' as NavTab,
            label: 'POS Billing',
            icon: ShoppingBag,
            badge: null,
            badgeColor: '',
            visible: isAdmin || isSalesFinance,
        },
        {
            key: 'repairs' as NavTab,
            label: 'Drive Repairs',
            icon: Wrench,
            badge: activeRepairsCount > 0 ? activeRepairsCount : null,
            badgeColor: 'bg-indigo-500 text-white',
            visible: isAdmin || isLabTech,
        },
        {
            key: 'panels' as NavTab,
            label: 'Panel Mfg.',
            icon: Factory,
            badge: null,
            badgeColor: '',
            visible: isAdmin || isSalesFinance,
        },
        {
            key: 'orders' as NavTab,
            label: 'Invoices & Sales',
            icon: FileText,
            badge: null,
            badgeColor: '',
            visible: isAdmin || isSalesFinance,
        },
        {
            key: 'low-stock' as NavTab,
            label: 'Low Stock Alerts',
            icon: AlertTriangle,
            badge: lowStockCount > 0 ? lowStockCount : null,
            badgeColor: 'bg-amber-500 text-slate-950 font-bold',
            visible: isAdmin || isStoreKeeper,
        },
    ];

    const navItems = allNavItems.filter((item) => item.visible);

    const getRoleBadgeStyle = (role?: string) => {
        switch (role) {
            case 'ADMIN':
                return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
            case 'STORE_KEEPER':
                return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
            case 'SALES_FINANCE':
                return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            case 'LAB_TECHNICIAN':
                return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            default:
                return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'ADMIN':
                return 'Admin';
            case 'STORE_KEEPER':
                return 'Store Keeper';
            case 'SALES_FINANCE':
                return 'Sales & Finance';
            case 'LAB_TECHNICIAN':
                return 'Lab Tech';
            default:
                return role || 'Staff';
        }
    };

    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden select-none">

            {/* 1. DESKTOP SIDEBAR (Visible on md: and up) */}
            <aside
                className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 z-30 shrink-0 ${isCollapsed ? 'w-20' : 'w-64'
                    }`}
            >
                {/* Brand & Collapse Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
                            <Zap size={22} className="fill-slate-950" />
                        </div>
                        {!isCollapsed && (
                            <div className="truncate">
                                <h1 className="font-extrabold text-sm text-slate-100 tracking-tight flex items-center gap-1.5">
                                    Gurukirpa
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                                        ERP
                                    </span>
                                </h1>
                                <p className="text-[10px] text-slate-400 truncate">Industrial Automation</p>
                            </div>
                        )}
                    </div>

                    {!isCollapsed && (
                        <button
                            onClick={() => setIsCollapsed(true)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Collapse Sidebar"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}
                </div>

                {isCollapsed && (
                    <div className="py-2 flex justify-center border-b border-slate-800">
                        <button
                            onClick={() => setIsCollapsed(false)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Expand Sidebar"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {/* Navigation Links List */}
                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto no-scrollbar">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            activeTab === item.key ||
                            (item.key === 'table' && activeTab === 'inventory');

                        return (
                            <button
                                key={item.key}
                                onClick={() => setActiveTab(item.key)}
                                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all relative ${isActive
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
                                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                                title={item.label}
                            >
                                <Icon size={18} className={isActive ? 'text-emerald-400 shrink-0' : 'text-slate-400 shrink-0'} />

                                {!isCollapsed && (
                                    <span className="truncate flex-1 text-left">{item.label}</span>
                                )}

                                {!isCollapsed && item.badge !== null && (
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}
                                    >
                                        {item.badge}
                                    </span>
                                )}

                                {isCollapsed && item.badge !== null && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* User Profile & Logout Bottom Section */}
                {/* User Profile & Logout Bottom Section */}
                <div className="p-3 border-t border-slate-800 bg-slate-900/60 space-y-2">
                    {/* Admin Staff Management Trigger */}
                    {isAdmin && !isCollapsed && (
                        <button
                            onClick={() => setIsStaffModalOpen(true)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all"
                        >
                            <Users size={15} />
                            <span>Manage Team & Staff</span>
                        </button>
                    )}

                    {isAdmin && isCollapsed && (
                        <div className="flex justify-center">
                            <button
                                onClick={() => setIsStaffModalOpen(true)}
                                className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-xl border border-purple-500/30 transition-colors"
                                title="Manage Team & Staff"
                            >
                                <Users size={16} />
                            </button>
                        </div>
                    )}

                    {!isCollapsed ? (
                        <div className="flex items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                                    <User size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-200 truncate">{user?.name || 'Staff'}</p>
                                    <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase inline-block ${getRoleBadgeStyle(
                                            user?.role
                                        )}`}
                                    >
                                        {getRoleLabel(user?.role)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                                title="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                                <User size={16} />
                            </div>
                            <button
                                onClick={logout}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* 2. MAIN APP CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">

                {/* Mobile Top App Bar (Visible on mobile only) */}
                <header className="md:hidden px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-20 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md">
                            <Zap size={18} className="fill-slate-950" />
                        </div>
                        <div>
                            <h1 className="font-extrabold text-sm text-slate-100">Gurukirpa</h1>
                            <p className="text-[10px] text-slate-400 capitalize">{activeTab.replace('-', ' ')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button
                                onClick={() => setIsStaffModalOpen(true)}
                                className="p-1.5 text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded-lg"
                                title="Manage Team"
                            >
                                <Users size={15} />
                            </button>
                        )}
                        <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getRoleBadgeStyle(
                                user?.role
                            )}`}
                        >
                            {getRoleLabel(user?.role)}
                        </span>
                        <button
                            onClick={logout}
                            className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 rounded-lg"
                            title="Sign Out"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                </header>

                {/* Main Render Area */}
                <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                    {children}
                </main>

                {/* Staff Management Modal */}
                <ManageStaffModal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} />

                {/* 3. MOBILE BOTTOM NAVIGATION BAR (Visible on mobile only) */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex justify-around items-center z-40 shadow-2xl">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            activeTab === item.key ||
                            (item.key === 'table' && activeTab === 'inventory');

                        return (
                            <button
                                key={item.key}
                                onClick={() => setActiveTab(item.key)}
                                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all relative ${isActive
                                    ? 'text-emerald-400 font-extrabold'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                <Icon size={19} className={isActive ? 'text-emerald-400 scale-110' : ''} />
                                <span className="text-[10px] tracking-tight">{item.label.split(' ')[0]}</span>

                                {item.badge !== null && (
                                    <span
                                        className={`absolute top-0 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${item.badgeColor}`}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

