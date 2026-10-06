import React, { useState, useMemo } from 'react';
import {
    Factory, Plus, Search, Filter, RefreshCw,
    Loader2, AlertCircle, Cpu, CheckCircle, Truck,
    DollarSign, TrendingUp, Clock, Package
} from 'lucide-react';
import { useGetPanelProjects, useDeletePanelProject, type PanelProject, type PanelProjectStatus } from '../api/panelsApi';
import { CreatePanelOrderModal } from './CreatePanelOrderModal';
import { PanelDetailsModal } from './PanelDetailsModal';
import { useAuth } from '../context/AuthContext';

interface PanelManagementScreenProps {
    onBack: () => void;
}

const PANEL_TYPE_LABELS: Record<string, string> = {
    PLC_PANEL: 'PLC',
    MCC_PANEL: 'MCC',
    APFC_PANEL: 'APFC',
    HMI_PANEL: 'HMI',
    VFD_PANEL: 'VFD',
    POWER_DISTRIBUTION_PANEL: 'PDB',
    CUSTOM_PANEL: 'Custom',
};

const STATUS_COLORS: Record<string, string> = {
    ORDER_BOOKED: 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
    MATERIAL_ISSUED: 'bg-amber-900/40 text-amber-300 border border-amber-700/40',
    WIRING_ASSEMBLY: 'bg-orange-900/40 text-orange-300 border border-orange-700/40',
    TESTING_QA: 'bg-purple-900/40 text-purple-300 border border-purple-700/40',
    READY_FOR_DISPATCH: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40',
    DELIVERED: 'bg-slate-700/60 text-slate-400 border border-slate-600',
    ON_HOLD: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
    CANCELLED: 'bg-red-900/40 text-red-400 border border-red-700/40',
};

const PRIORITY_BADGE: Record<string, string> = {
    NORMAL: '',
    HIGH: 'text-amber-400',
    URGENT: 'text-red-400 animate-pulse',
};

const ALL_STATUSES: PanelProjectStatus[] = [
    'ORDER_BOOKED', 'MATERIAL_ISSUED', 'WIRING_ASSEMBLY',
    'TESTING_QA', 'READY_FOR_DISPATCH', 'DELIVERED', 'ON_HOLD', 'CANCELLED',
];

const ACTIVE_STATUSES: PanelProjectStatus[] = [
    'ORDER_BOOKED', 'MATERIAL_ISSUED', 'WIRING_ASSEMBLY', 'TESTING_QA', 'READY_FOR_DISPATCH'
];

export const PanelManagementScreen: React.FC<PanelManagementScreenProps> = ({ onBack }) => {
    const { isAdmin } = useAuth();
    const { data: panelsRaw, isLoading, isError, refetch } = useGetPanelProjects();
    const deletePanel = useDeletePanelProject();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedPanelId, setSelectedPanelId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<PanelProjectStatus | 'ALL' | 'ACTIVE'>('ACTIVE');
    const [filterType, setFilterType] = useState<string>('ALL');

    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3000);
    };

    const panels: PanelProject[] = Array.isArray(panelsRaw) ? panelsRaw : [];

    // KPIs
    const kpis = useMemo(() => {
        const active = panels.filter((p) => ACTIVE_STATUSES.includes(p.status));
        const delivered = panels.filter((p) => p.status === 'DELIVERED');
        const totalRevenue = delivered.reduce((sum, p) => sum + Number(p.sellingPrice), 0);
        const totalBomCost = panels.reduce((sum, p) => sum + Number(p.bomCostTotal), 0);
        const totalPending = panels.filter((p) => p.paymentStatus !== 'PAID' && p.status !== 'CANCELLED').reduce((sum, p) => sum + Number(p.grandTotal) - Number(p.advanceReceived), 0);
        return { active: active.length, delivered: delivered.length, totalRevenue, totalBomCost, totalPending };
    }, [panels]);

    // Filtered panels
    const filtered = useMemo(() => {
        return panels.filter((p) => {
            const matchSearch = !search.trim() ||
                p.projectNumber.toLowerCase().includes(search.toLowerCase()) ||
                p.clientName.toLowerCase().includes(search.toLowerCase()) ||
                (p.companyName || '').toLowerCase().includes(search.toLowerCase());
            const matchStatus = filterStatus === 'ALL' ? true : filterStatus === 'ACTIVE' ? ACTIVE_STATUSES.includes(p.status) : p.status === filterStatus;
            const matchType = filterType === 'ALL' || p.panelType === filterType;
            return matchSearch && matchStatus && matchType;
        });
    }, [panels, search, filterStatus, filterType]);

    const handleDelete = (p: PanelProject) => {
        if (!confirm(`Delete ${p.projectNumber}? This cannot be undone.`)) return;
        deletePanel.mutate(p.id, {
            onSuccess: () => showToast('success', `${p.projectNumber} deleted`),
            onError: (e: any) => showToast('error', e?.response?.data?.error || 'Delete failed'),
        });
    };

    const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    <span>{toast.type === 'success' ? '✓' : '✗'}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                        <Factory size={20} className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-100">Panel Manufacturing</h1>
                        <p className="text-xs text-slate-500">Custom automation panel orders & BOM tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => refetch()} className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                        <RefreshCw size={15} />
                    </button>
                    <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                        <Plus size={15} /> New Order
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-3 flex-shrink-0">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                        <Clock size={16} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-100">{kpis.active}</p>
                        <p className="text-xs text-slate-500">Active Projects</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                        <Truck size={16} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-100">{kpis.delivered}</p>
                        <p className="text-xs text-slate-500">Delivered</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={16} className="text-violet-400" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-emerald-400">₹{fmt(kpis.totalRevenue)}</p>
                        <p className="text-xs text-slate-500">Revenue (Delivered)</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-amber-400">₹{fmt(kpis.totalBomCost)}</p>
                        <p className="text-xs text-slate-500">Total BOM Cost</p>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-600/20 flex items-center justify-center flex-shrink-0">
                        <DollarSign size={16} className="text-red-400" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-red-400">₹{fmt(kpis.totalPending)}</p>
                        <p className="text-xs text-slate-500">Payment Pending</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="px-6 pb-3 flex flex-wrap gap-3 flex-shrink-0">
                <div className="flex-1 min-w-48 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                        placeholder="Search by project no., client, company..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                    <option value="ACTIVE">Active Projects</option>
                    <option value="ALL">All Statuses</option>
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="ALL">All Panel Types</option>
                    {Object.entries(PANEL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {/* Table / Content */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="animate-spin text-violet-400" size={36} />
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center h-48 text-red-400 gap-2">
                        <AlertCircle size={32} />
                        <p>Failed to load panel projects. Is the backend running?</p>
                        <button onClick={() => refetch()} className="mt-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">Retry</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                        <Factory size={40} className="opacity-20" />
                        <p className="text-sm">{panels.length === 0 ? 'No panel orders yet. Create your first one!' : 'No projects match your filters.'}</p>
                        {panels.length === 0 && (
                            <button onClick={() => setIsCreateOpen(true)} className="mt-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors">
                                + Book First Panel Order
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-800">
                                        <th className="text-left py-3 font-medium">Project</th>
                                        <th className="text-left py-3 font-medium">Client</th>
                                        <th className="text-left py-3 font-medium">Type</th>
                                        <th className="text-left py-3 font-medium">Status</th>
                                        <th className="text-right py-3 font-medium">Selling Price</th>
                                        <th className="text-right py-3 font-medium">BOM Cost</th>
                                        <th className="text-left py-3 font-medium">Payment</th>
                                        <th className="text-left py-3 font-medium">Target</th>
                                        <th className="py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {filtered.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-900/60 transition-colors group cursor-pointer" onClick={() => setSelectedPanelId(p.id)}>
                                            <td className="py-3 pr-4">
                                                <p className="font-semibold text-slate-200">{p.projectNumber}</p>
                                                <p className={`text-xs ${PRIORITY_BADGE[p.priority]}`}>{p.priority !== 'NORMAL' ? `⚡ ${p.priority}` : ''}</p>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <p className="text-slate-200">{p.clientName}</p>
                                                {p.companyName && <p className="text-xs text-slate-500">{p.companyName}</p>}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs font-medium">{PANEL_TYPE_LABELS[p.panelType]}</span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status.replace(/_/g, ' ')}</span>
                                            </td>
                                            <td className="py-3 pr-4 text-right font-semibold text-emerald-400">₹{Number(p.sellingPrice).toLocaleString('en-IN')}</td>
                                            <td className="py-3 pr-4 text-right text-amber-400">₹{Number(p.bomCostTotal).toLocaleString('en-IN')}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`text-xs font-semibold ${p.paymentStatus === 'PAID' ? 'text-emerald-400' : p.paymentStatus === 'PARTIAL' ? 'text-amber-400' : 'text-red-400'}`}>{p.paymentStatus}</span>
                                            </td>
                                            <td className="py-3 pr-4 text-slate-400 text-xs">
                                                {p.targetDeliveryDate ? new Date(p.targetDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedPanelId(p.id); }} className="px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-400 text-xs font-medium hover:bg-violet-600/40 transition-colors">
                                                        Open
                                                    </button>
                                                    {isAdmin && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="px-2 py-1.5 rounded-lg bg-red-900/20 text-red-400 text-xs hover:bg-red-900/40 transition-colors">
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                            {filtered.map((p) => (
                                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setSelectedPanelId(p.id)}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-bold text-slate-100">{p.projectNumber}</p>
                                            <p className="text-xs text-slate-400">{p.clientName} {p.companyName ? `· ${p.companyName}` : ''}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status.replace(/_/g, ' ')}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{PANEL_TYPE_LABELS[p.panelType]}</span>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-400">₹{Number(p.sellingPrice).toLocaleString('en-IN')}</p>
                                            <p className="text-xs text-slate-500">BOM: ₹{Number(p.bomCostTotal).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <CreatePanelOrderModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
            <PanelDetailsModal panelId={selectedPanelId} onClose={() => setSelectedPanelId(null)} />
        </div>
    );
};
