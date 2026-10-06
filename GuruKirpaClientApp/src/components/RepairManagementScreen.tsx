import React, { useState, useMemo } from 'react';
import {
    Wrench, Plus, Search, ArrowLeft, RefreshCw, Loader2,
    CheckCircle2, Clock, AlertTriangle, XCircle, User,
    Phone, Building, Send, Eye, Trash2, Calendar, Tag, ShieldAlert,
    FileSpreadsheet, Filter
} from 'lucide-react';
import {
    useGetRepairs,
    useDeleteRepair,
    type Repair,
    type RepairStatus,
    type RepairPriority
} from '../api/repairsApi';
import { useAuth } from '../context/AuthContext';
import { CreateJobCardModal } from './CreateJobCardModal';
import { RepairDetailsModal } from './RepairDetailsModal';

interface RepairManagementScreenProps {
    onBack?: () => void;
}

const STATUS_FILTERS: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All Jobs' },
    { key: 'RECEIVED', label: 'Received (Inward)' },
    { key: 'IN_DIAGNOSIS', label: 'In Diagnosis' },
    { key: 'IN_REPAIR', label: 'In Repair' },
    { key: 'TESTING', label: 'Bench Testing' },
    { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
    { key: 'DELIVERED', label: 'Delivered / Closed' },
    { key: 'UNREPAIRABLE_RETURN', label: 'Unrepairable' },
];

export const RepairManagementScreen: React.FC<RepairManagementScreenProps> = ({ onBack }) => {
    const { isAdmin } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [brandFilter, setBrandFilter] = useState<string>('ALL');
    const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);

    // Fetch repairs query
    const {
        data: rawRepairs,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useGetRepairs({
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        brand: brandFilter !== 'ALL' ? brandFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
    });

    const deleteRepairMutation = useDeleteRepair();
    const repairs = Array.isArray(rawRepairs) ? rawRepairs : [];

    // Local filter for responsive instantaneous feedback
    const filteredRepairs = useMemo(() => {
        return repairs.filter((r) => {
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !q ||
                r.jobCardNumber.toLowerCase().includes(q) ||
                r.customerName.toLowerCase().includes(q) ||
                (r.companyName && r.companyName.toLowerCase().includes(q)) ||
                r.modelNumber.toLowerCase().includes(q) ||
                r.serialNumber.toLowerCase().includes(q) ||
                r.customerPhone.includes(q);

            const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
            const matchesBrand = brandFilter === 'ALL' || r.brand === brandFilter;
            const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;

            return matchesSearch && matchesStatus && matchesBrand && matchesPriority;
        });
    }, [repairs, searchQuery, statusFilter, brandFilter, priorityFilter]);

    // Distinct Brands for filter dropdown
    const brandsList = useMemo(() => {
        const unique = Array.from(new Set(repairs.map((r) => r.brand).filter(Boolean)));
        return ['ALL', ...unique];
    }, [repairs]);

    // KPI Metrics
    const metrics = useMemo(() => {
        let activeCount = 0;
        let inDiagnosisCount = 0;
        let readyForPickupCount = 0;
        let deliveredCount = 0;
        let totalRevenue = 0;

        repairs.forEach((r) => {
            if (['RECEIVED', 'IN_DIAGNOSIS', 'ESTIMATION_SENT', 'IN_REPAIR', 'WAITING_FOR_PARTS', 'TESTING'].includes(r.status)) {
                activeCount++;
            }
            if (r.status === 'IN_DIAGNOSIS' || r.status === 'ESTIMATION_SENT') {
                inDiagnosisCount++;
            }
            if (r.status === 'READY_FOR_PICKUP') {
                readyForPickupCount++;
            }
            if (r.status === 'DELIVERED') {
                deliveredCount++;
            }
            totalRevenue += Number(r.grandTotal) || 0;
        });

        return {
            totalJobs: repairs.length,
            activeCount,
            inDiagnosisCount,
            readyForPickupCount,
            deliveredCount,
            totalRevenue,
        };
    }, [repairs]);

    const getStatusBadge = (status: RepairStatus) => {
        switch (status) {
            case 'RECEIVED':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
            case 'IN_DIAGNOSIS':
                return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
            case 'ESTIMATION_SENT':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            case 'IN_REPAIR':
                return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
            case 'WAITING_FOR_PARTS':
                return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
            case 'TESTING':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
            case 'READY_FOR_PICKUP':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            case 'DELIVERED':
                return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
            case 'UNREPAIRABLE_RETURN':
                return 'bg-red-500/10 text-red-400 border-red-500/30';
            case 'SCRAP':
                return 'bg-slate-700 text-slate-400 border-slate-600';
            default:
                return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const handleDelete = (repairId: number, jobCardNumber: string) => {
        if (window.confirm(`Are you sure you want to delete Job-Card ${jobCardNumber}?`)) {
            deleteRepairMutation.mutate(repairId);
        }
    };

    const handleQuickWhatsApp = (r: Repair) => {
        const phone = r.customerPhone.replace(/[^0-9]/g, '');
        const client = r.companyName ? `${r.companyName} (${r.customerName})` : r.customerName;
        const text = encodeURIComponent(
            `Hello ${client}, this is Gurukirpa Automation regarding your ${r.brand} ${r.modelNumber} (Job Card: ${r.jobCardNumber}). Current Status: ${r.status.replace('_', ' ')}.`
        );
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">

            {/* Top Bar */}
            <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <span>Drive & Controller Repair Management</span>
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                {metrics.totalJobs} Job-Cards
                            </span>
                        </h1>
                        <p className="text-xs text-slate-400">
                            Track inward drives, diagnose faults, log replaced spares & dispatch equipment
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl border border-slate-700/60 transition-colors"
                        title="Refresh Repairs"
                    >
                        <RefreshCw size={16} className={isFetching ? 'animate-spin text-emerald-400' : ''} />
                    </button>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-transform active:scale-95"
                    >
                        <Plus size={16} /> New Inward Job-Card
                    </button>
                </div>
            </header>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">

                {/* KPI Metrics Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Wrench size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Active in Workshop</p>
                            <p className="text-xl font-bold text-blue-400 mt-0.5">{metrics.activeCount}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <Clock size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">In Diagnosis / Quote</p>
                            <p className="text-xl font-bold text-amber-400 mt-0.5">{metrics.inDiagnosisCount}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Ready for Pickup</p>
                            <p className="text-xl font-bold text-emerald-400 mt-0.5">{metrics.readyForPickupCount}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
                            <Tag size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Total Repair Revenue</p>
                            <p className="text-xl font-bold text-teal-400 mt-0.5">
                                ₹{metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">

                        {/* Search Input */}
                        <div className="relative w-full md:w-80">
                            <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search Job #, Client, Model, Serial #..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Dropdown Filters */}
                        <div className="flex gap-2 w-full md:w-auto">
                            {/* Brand Filter */}
                            <select
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                                <option value="ALL">All Brands</option>
                                {brandsList.filter((b) => b !== 'ALL').map((brand) => (
                                    <option key={brand} value={brand}>
                                        {brand}
                                    </option>
                                ))}
                            </select>

                            {/* Priority Filter */}
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                                <option value="ALL">All Priorities</option>
                                <option value="URGENT">Urgent Breakdown</option>
                                <option value="HIGH">High Priority</option>
                                <option value="NORMAL">Normal Priority</option>
                            </select>
                        </div>
                    </div>

                    {/* Status Filter Chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {STATUS_FILTERS.map((s) => (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => setStatusFilter(s.key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${statusFilter === s.key
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Job Cards Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="animate-spin mb-2 text-emerald-400" size={32} />
                            <p className="text-xs">Loading repair job-cards...</p>
                        </div>
                    ) : isError ? (
                        <div className="p-8 text-center text-red-400 text-xs">
                            Failed to connect to backend server.
                        </div>
                    ) : filteredRepairs.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 text-xs space-y-2">
                            <Wrench size={32} className="mx-auto text-slate-600" />
                            <p>{repairs.length === 0 ? 'No repair jobs created yet.' : 'No repair jobs match your search.'}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                                        <th className="py-3.5 px-4">Job # & Inward Date</th>
                                        <th className="py-3.5 px-4">Equipment & Brand</th>
                                        <th className="py-3.5 px-4">Customer / Plant</th>
                                        <th className="py-3.5 px-4">Reported Fault</th>
                                        <th className="py-3.5 px-4 text-center">Status</th>
                                        <th className="py-3.5 px-4 text-right">Bill / Total</th>
                                        <th className="py-3.5 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {filteredRepairs.map((repair) => {
                                        const isUrgent = repair.priority === 'URGENT';
                                        const isHigh = repair.priority === 'HIGH';
                                        const billAmount = Number(repair.grandTotal) || Number(repair.estimatedCost) || 0;

                                        return (
                                            <tr
                                                key={repair.id}
                                                className="hover:bg-slate-800/40 transition-colors"
                                            >
                                                {/* Job # & Priority & Date */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-emerald-400 text-sm">
                                                            {repair.jobCardNumber}
                                                        </span>
                                                        {isUrgent && (
                                                            <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded font-bold">
                                                                URGENT
                                                            </span>
                                                        )}
                                                        {isHigh && (
                                                            <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                                                                HIGH
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Clock size={11} />
                                                        {repair.receivedDate
                                                            ? new Date(repair.receivedDate).toLocaleDateString('en-IN', {
                                                                dateStyle: 'medium',
                                                            })
                                                            : 'Recent'}
                                                    </div>
                                                </td>

                                                {/* Equipment & Brand */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                                            {repair.brand}
                                                        </span>
                                                        <span className="font-bold text-slate-100 text-xs">
                                                            {repair.modelNumber}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                        SN: {repair.serialNumber} &bull; {repair.deviceType}
                                                    </div>
                                                </td>

                                                {/* Customer / Plant */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-slate-100 text-xs flex items-center gap-1">
                                                        <User size={13} className="text-slate-400" />
                                                        {repair.customerName}
                                                    </div>
                                                    {repair.companyName && (
                                                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Building size={11} className="text-slate-500" />
                                                            {repair.companyName}
                                                        </div>
                                                    )}
                                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                                        {repair.customerPhone}
                                                    </div>
                                                </td>

                                                {/* Reported Fault */}
                                                <td className="py-3.5 px-4 max-w-xs">
                                                    <p className="text-xs text-slate-300 line-clamp-2">
                                                        {repair.reportedFault}
                                                    </p>
                                                    {repair.assignedTechnician && (
                                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                                            Tech: <span className="text-slate-400">{repair.assignedTechnician}</span>
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Status Badge */}
                                                <td className="py-3.5 px-4 text-center">
                                                    <span
                                                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase ${getStatusBadge(
                                                            repair.status
                                                        )}`}
                                                    >
                                                        {repair.status.replace('_', ' ')}
                                                    </span>
                                                </td>

                                                {/* Amount */}
                                                <td className="py-3.5 px-4 text-right">
                                                    <span className="font-bold text-sm text-emerald-400">
                                                        ₹{billAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                                    </span>
                                                    {repair.paymentStatus && (
                                                        <span
                                                            className={`block text-[9px] font-bold uppercase mt-0.5 ${repair.paymentStatus === 'PAID'
                                                                    ? 'text-emerald-400'
                                                                    : 'text-amber-400'
                                                                }`}
                                                        >
                                                            {repair.paymentStatus}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* Open Details & Workshop Sheet */}
                                                        <button
                                                            onClick={() => setSelectedRepairId(repair.id)}
                                                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 transition-transform active:scale-95"
                                                            title="Open Diagnosis & Job-Card Sheet"
                                                        >
                                                            <Eye size={15} />
                                                        </button>

                                                        {/* Quick WhatsApp */}
                                                        <button
                                                            onClick={() => handleQuickWhatsApp(repair)}
                                                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 transition-transform active:scale-95"
                                                            title="WhatsApp Customer"
                                                        >
                                                            <Send size={15} />
                                                        </button>

                                                        {/* Delete (Admin only) */}
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleDelete(repair.id, repair.jobCardNumber)}
                                                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-transform active:scale-95"
                                                                title="Delete Job-Card"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Inward Create Job-Card Modal */}
            <CreateJobCardModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {/* Diagnostic & Workshop Job-Card Details Modal */}
            <RepairDetailsModal
                repairId={selectedRepairId}
                isOpen={!!selectedRepairId}
                onClose={() => setSelectedRepairId(null)}
            />
        </div>
    );
};

