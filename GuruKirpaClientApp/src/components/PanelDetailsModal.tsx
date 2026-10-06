import React, { useState } from 'react';
import {
    X, Factory, Package, ChevronRight, Plus, Trash2,
    FileText, DollarSign, Clock, CheckCircle, Truck,
    AlertCircle, Loader2, Wrench, TestTube, Zap, ClipboardList
} from 'lucide-react';
import {
    useGetPanelById, useUpdatePanelProject, useAddBomItem, useRemoveBomItem,
    type PanelProjectWithBom, type PanelProjectStatus, type PanelBomSource, type AddBomItemPayload
} from '../api/panelsApi';
import { useGetProducts } from '../api/productsApi';

interface PanelDetailsModalProps {
    panelId: number | null;
    onClose: () => void;
}

const PANEL_TYPE_LABELS: Record<string, string> = {
    PLC_PANEL: 'PLC Panel',
    MCC_PANEL: 'MCC Panel',
    APFC_PANEL: 'APFC Panel',
    HMI_PANEL: 'HMI Panel',
    VFD_PANEL: 'VFD Panel',
    POWER_DISTRIBUTION_PANEL: 'Power Distribution Panel',
    CUSTOM_PANEL: 'Custom Panel',
};

const STATUS_STEPS: { key: PanelProjectStatus; label: string; icon: React.ElementType }[] = [
    { key: 'ORDER_BOOKED', label: 'Order Booked', icon: ClipboardList },
    { key: 'MATERIAL_ISSUED', label: 'Material Issued', icon: Package },
    { key: 'WIRING_ASSEMBLY', label: 'Wiring & Assembly', icon: Zap },
    { key: 'TESTING_QA', label: 'Testing & QA', icon: TestTube },
    { key: 'READY_FOR_DISPATCH', label: 'Ready for Dispatch', icon: CheckCircle },
    { key: 'DELIVERED', label: 'Delivered', icon: Truck },
];

const PRIORITY_COLORS: Record<string, string> = {
    NORMAL: 'bg-slate-700 text-slate-300',
    HIGH: 'bg-amber-900/50 text-amber-400 border border-amber-700/50',
    URGENT: 'bg-red-900/50 text-red-400 border border-red-700/50 animate-pulse',
};

const PAYMENT_COLORS: Record<string, string> = {
    UNPAID: 'text-red-400',
    PARTIAL: 'text-amber-400',
    PAID: 'text-emerald-400',
};

type ModalTab = 'status' | 'bom' | 'billing' | 'audit';

export const PanelDetailsModal: React.FC<PanelDetailsModalProps> = ({ panelId, onClose }) => {
    const [activeTab, setActiveTab] = useState<ModalTab>('status');
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const { data: panel, isLoading } = useGetPanelById(panelId);
    const { data: allProducts } = useGetProducts();
    const updatePanel = useUpdatePanelProject();
    const addBom = useAddBomItem();
    const removeBom = useRemoveBomItem();

    // BOM form state
    const [bomForm, setBomForm] = useState<{
        source: PanelBomSource;
        productId: number | null;
        componentName: string;
        componentCode: string;
        quantity: number;
        unitCost: number;
        notes: string;
    }>({
        source: 'STORE_INVENTORY',
        productId: null,
        componentName: '',
        componentCode: '',
        quantity: 1,
        unitCost: 0,
        notes: '',
    });

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const products = Array.isArray(allProducts) ? allProducts : [];

    if (!panelId) return null;

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                <Loader2 className="animate-spin text-violet-400" size={40} />
            </div>
        );
    }

    if (!panel) return null;

    const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === panel.status);
    const isTerminal = ['ON_HOLD', 'CANCELLED', 'DELIVERED'].includes(panel.status);

    const handleStatusChange = (newStatus: PanelProjectStatus) => {
        updatePanel.mutate(
            { id: panel.id, status: newStatus },
            {
                onSuccess: () => showToast('success', `Status updated to ${newStatus.replace(/_/g, ' ')}`),
                onError: (e: any) => showToast('error', e?.response?.data?.error || 'Failed to update status'),
            }
        );
    };

    const handlePaymentChange = (val: string) => {
        updatePanel.mutate(
            { id: panel.id, paymentStatus: val as any },
            {
                onSuccess: () => showToast('success', 'Payment status updated'),
                onError: (e: any) => showToast('error', e?.response?.data?.error || 'Failed'),
            }
        );
    };

    const handleAddBom = () => {
        if (!bomForm.componentName.trim()) return showToast('error', 'Component name is required');
        if (bomForm.quantity < 1) return showToast('error', 'Quantity must be at least 1');
        if (bomForm.unitCost <= 0) return showToast('error', 'Unit cost must be greater than 0');
        if (bomForm.source === 'STORE_INVENTORY' && !bomForm.productId) return showToast('error', 'Select a product from store');

        addBom.mutate(
            {
                panelId: panel.id,
                source: bomForm.source,
                productId: bomForm.source === 'STORE_INVENTORY' ? bomForm.productId : null,
                componentName: bomForm.componentName,
                componentCode: bomForm.componentCode || undefined,
                quantity: bomForm.quantity,
                unitCost: bomForm.unitCost,
                notes: bomForm.notes || undefined,
            },
            {
                onSuccess: () => {
                    showToast('success', 'BOM item added & stock deducted!');
                    setBomForm({ source: 'STORE_INVENTORY', productId: null, componentName: '', componentCode: '', quantity: 1, unitCost: 0, notes: '' });
                },
                onError: (e: any) => showToast('error', e?.response?.data?.error || 'Failed to add BOM item'),
            }
        );
    };

    const handleRemoveBom = (itemId: number, name: string) => {
        if (!confirm(`Remove "${name}" from BOM? If it was from store stock, it will be restored.`)) return;
        removeBom.mutate(
            { panelId: panel.id, itemId },
            {
                onSuccess: () => showToast('success', 'BOM item removed & stock restored'),
                onError: (e: any) => showToast('error', e?.response?.data?.error || 'Failed'),
            }
        );
    };

    const fmt = (v: string | number) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const margin = Number(panel.sellingPrice) - Number(panel.bomCostTotal) - Number(panel.laborCost) - Number(panel.otherCosts);
    const marginPct = Number(panel.sellingPrice) > 0 ? (margin / Number(panel.sellingPrice)) * 100 : 0;

    const tabCls = (t: ModalTab) =>
        `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    <span>{toast.type === 'success' ? '✓' : '✗'}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-start justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                            <Factory size={20} className="text-violet-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-100">{panel.projectNumber}</h2>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[panel.priority]}`}>{panel.priority}</span>
                            </div>
                            <p className="text-xs text-slate-400">{PANEL_TYPE_LABELS[panel.panelType]} — {panel.clientName} {panel.companyName ? `(${panel.companyName})` : ''}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-800 px-6 py-3 flex gap-2 flex-shrink-0 overflow-x-auto">
                    <button className={tabCls('status')} onClick={() => setActiveTab('status')}>📋 Status</button>
                    <button className={tabCls('bom')} onClick={() => setActiveTab('bom')}>🔩 BOM ({panel.bomItems?.length || 0})</button>
                    <button className={tabCls('billing')} onClick={() => setActiveTab('billing')}>💰 Billing</button>
                    <button className={tabCls('audit')} onClick={() => setActiveTab('audit')}>📜 Audit Trail</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* === STATUS TAB === */}
                    {activeTab === 'status' && (
                        <div className="space-y-6">
                            {/* Progress Stepper */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-300 mb-4">Production Progress</h3>
                                <div className="flex items-center gap-0">
                                    {STATUS_STEPS.map((step, idx) => {
                                        const Icon = step.icon;
                                        const done = currentStepIndex >= idx;
                                        const isCurrent = currentStepIndex === idx;
                                        return (
                                            <React.Fragment key={step.key}>
                                                <button
                                                    onClick={() => !isTerminal && handleStatusChange(step.key)}
                                                    title={`Move to: ${step.label}`}
                                                    className={`flex flex-col items-center gap-1 flex-1 group ${isTerminal ? 'cursor-default' : 'cursor-pointer'}`}
                                                >
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${isCurrent ? 'border-violet-400 bg-violet-600 scale-110' : done ? 'border-emerald-500 bg-emerald-600' : 'border-slate-700 bg-slate-800 group-hover:border-violet-500'}`}>
                                                        <Icon size={14} className="text-white" />
                                                    </div>
                                                    <span className={`text-[9px] text-center leading-tight ${isCurrent ? 'text-violet-400 font-semibold' : done ? 'text-emerald-400' : 'text-slate-600'}`}>{step.label}</span>
                                                </button>
                                                {idx < STATUS_STEPS.length - 1 && (
                                                    <div className={`h-0.5 flex-1 ${currentStepIndex > idx ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Hold / Cancel / Quick Next Step */}
                            {!isTerminal && (
                                <div className="flex gap-3">
                                    {currentStepIndex < STATUS_STEPS.length - 1 && (
                                        <button
                                            onClick={() => handleStatusChange(STATUS_STEPS[currentStepIndex + 1].key)}
                                            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                        >
                                            Move to {STATUS_STEPS[currentStepIndex + 1]?.label} <ChevronRight size={15} />
                                        </button>
                                    )}
                                    <button onClick={() => handleStatusChange('ON_HOLD')} className="px-4 py-2.5 rounded-xl border border-amber-700/50 bg-amber-900/20 text-amber-400 text-sm font-medium hover:bg-amber-900/40 transition-colors">
                                        On Hold
                                    </button>
                                    <button onClick={() => handleStatusChange('CANCELLED')} className="px-4 py-2.5 rounded-xl border border-red-700/50 bg-red-900/20 text-red-400 text-sm font-medium hover:bg-red-900/40 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {/* Project Details */}
                            <div className="bg-slate-800/50 rounded-xl p-4 space-y-2 text-sm">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Project Info</h4>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div><span className="text-slate-500">Description:</span><p className="text-slate-200 mt-0.5">{panel.panelDescription}</p></div>
                                    <div><span className="text-slate-500">Engineer:</span><p className="text-slate-200 mt-0.5">{panel.assignedEngineer || '—'}</p></div>
                                    <div><span className="text-slate-500">Order Date:</span><p className="text-slate-200 mt-0.5">{new Date(panel.orderDate).toLocaleDateString('en-IN')}</p></div>
                                    <div><span className="text-slate-500">Target Delivery:</span><p className="text-slate-200 mt-0.5">{panel.targetDeliveryDate ? new Date(panel.targetDeliveryDate).toLocaleDateString('en-IN') : '—'}</p></div>
                                    <div><span className="text-slate-500">Phone:</span><p className="text-slate-200 mt-0.5">{panel.clientPhone}</p></div>
                                    <div><span className="text-slate-500">GSTIN:</span><p className="text-slate-200 mt-0.5">{panel.clientGstin || '—'}</p></div>
                                </div>
                                {panel.notes && <p className="text-xs text-slate-400 border-t border-slate-700 pt-2 mt-2">📝 {panel.notes}</p>}
                            </div>
                        </div>
                    )}

                    {/* === BOM TAB === */}
                    {activeTab === 'bom' && (
                        <div className="space-y-5">
                            {/* BOM Summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-800 rounded-xl p-3 text-center">
                                    <p className="text-xs text-slate-500 mb-1">BOM Items</p>
                                    <p className="text-2xl font-bold text-slate-100">{panel.bomItems?.length || 0}</p>
                                </div>
                                <div className="bg-slate-800 rounded-xl p-3 text-center">
                                    <p className="text-xs text-slate-500 mb-1">BOM Cost Total</p>
                                    <p className="text-lg font-bold text-amber-400">₹{fmt(panel.bomCostTotal)}</p>
                                </div>
                                <div className="bg-slate-800 rounded-xl p-3 text-center">
                                    <p className="text-xs text-slate-500 mb-1">Margin</p>
                                    <p className={`text-lg font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{fmt(margin)}</p>
                                    <p className={`text-xs ${marginPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{marginPct.toFixed(1)}%</p>
                                </div>
                            </div>

                            {/* Add BOM Item Form */}
                            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                                <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-3 flex items-center gap-2"><Plus size={12} /> Add Component to BOM</h4>

                                {/* Source Toggle */}
                                <div className="flex gap-2 mb-3">
                                    {(['STORE_INVENTORY', 'PURCHASE_REQUIRED', 'ALREADY_PURCHASED'] as PanelBomSource[]).map((s) => (
                                        <button key={s} onClick={() => setBomForm((f) => ({ ...f, source: s, productId: null, componentName: '', unitCost: 0 }))}
                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${bomForm.source === s ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                                            {s === 'STORE_INVENTORY' ? '🏪 From Store' : s === 'PURCHASE_REQUIRED' ? '🛒 Needs Purchase' : '✅ Already Purchased'}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {bomForm.source === 'STORE_INVENTORY' ? (
                                        <div className="col-span-2">
                                            <label className="block text-xs text-slate-400 mb-1">Select from Store Inventory *</label>
                                            <select
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                                                value={bomForm.productId || ''}
                                                onChange={(e) => {
                                                    const pid = Number(e.target.value);
                                                    const prod = products.find((p) => p.id === pid);
                                                    setBomForm((f) => ({
                                                        ...f,
                                                        productId: pid || null,
                                                        componentName: prod ? `${prod.brand} ${prod.modelNumber}` : '',
                                                        unitCost: prod ? parseFloat(String(prod.costPrice || 0)) : 0,
                                                    }));
                                                }}
                                            >
                                                <option value="">— Select product —</option>
                                                {products.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        [{p.stock} in stock] {p.brand} {p.modelNumber} — ₹{fmt(p.costPrice ?? 0)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="col-span-2">
                                            <label className="block text-xs text-slate-400 mb-1">Component Name *</label>
                                            <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500" placeholder="e.g. Siemens 3RT Contactor 18A" value={bomForm.componentName} onChange={(e) => setBomForm((f) => ({ ...f, componentName: e.target.value }))} />
                                        </div>
                                    )}

                                    {bomForm.source === 'STORE_INVENTORY' && bomForm.componentName && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-slate-400">Component: <span className="text-slate-200">{bomForm.componentName}</span></p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Component Code</label>
                                        <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500" placeholder="SKU / Part No." value={bomForm.componentCode} onChange={(e) => setBomForm((f) => ({ ...f, componentCode: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quantity *</label>
                                        <input type="number" min="1" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500" value={bomForm.quantity} onChange={(e) => setBomForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Unit Cost (₹) *</label>
                                        <input type="number" min="0" step="0.01" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500" value={bomForm.unitCost || ''} onChange={(e) => setBomForm((f) => ({ ...f, unitCost: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Total</label>
                                        <p className="px-3 py-2 text-sm font-semibold text-emerald-400">₹{fmt(bomForm.quantity * bomForm.unitCost)}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs text-slate-400 mb-1">Notes</label>
                                        <input className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500" placeholder="Optional note" value={bomForm.notes} onChange={(e) => setBomForm((f) => ({ ...f, notes: e.target.value }))} />
                                    </div>
                                </div>

                                <button onClick={handleAddBom} disabled={addBom.isPending} className="mt-3 w-full px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                                    {addBom.isPending ? <><Loader2 size={14} className="animate-spin" /> Adding...</> : <><Plus size={14} /> Add to BOM</>}
                                </button>
                            </div>

                            {/* BOM List */}
                            {panel.bomItems && panel.bomItems.length > 0 ? (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Bill of Materials</h4>
                                    {panel.bomItems.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 group">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-200 truncate">{item.componentName}</p>
                                                <p className="text-xs text-slate-500">{item.componentCode && `${item.componentCode} · `}{item.quantity} × ₹{fmt(item.unitCost)}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.source === 'STORE_INVENTORY' ? 'bg-emerald-900/40 text-emerald-400' : item.source === 'PURCHASE_REQUIRED' ? 'bg-amber-900/40 text-amber-400' : 'bg-blue-900/40 text-blue-400'}`}>
                                                    {item.source === 'STORE_INVENTORY' ? '🏪 Store' : item.source === 'PURCHASE_REQUIRED' ? '🛒 To Purchase' : '✅ Purchased'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 ml-3">
                                                <p className="text-sm font-bold text-slate-100">₹{fmt(item.totalCost)}</p>
                                                <button onClick={() => handleRemoveBom(item.id, item.componentName)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No BOM items yet. Add components above.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* === BILLING TAB === */}
                    {activeTab === 'billing' && (
                        <div className="space-y-4">
                            {/* Cost Breakdown */}
                            <div className="bg-slate-800 rounded-xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-700">
                                    <h4 className="text-sm font-semibold text-slate-200">Cost & Revenue Summary</h4>
                                </div>
                                <div className="p-4 space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-400"><span>BOM / Material Cost</span><span className="text-red-400">₹{fmt(panel.bomCostTotal)}</span></div>
                                    <div className="flex justify-between text-slate-400"><span>Labour Cost</span><span className="text-red-400">₹{fmt(panel.laborCost)}</span></div>
                                    <div className="flex justify-between text-slate-400"><span>Other Costs</span><span className="text-red-400">₹{fmt(panel.otherCosts)}</span></div>
                                    <div className="flex justify-between text-slate-400 border-t border-slate-700 pt-2"><span>Total Cost</span><span className="font-semibold text-red-400">₹{fmt(Number(panel.bomCostTotal) + Number(panel.laborCost) + Number(panel.otherCosts))}</span></div>
                                    <div className="flex justify-between text-slate-400 border-t border-slate-700 pt-2"><span>Selling Price</span><span className="text-emerald-400">₹{fmt(panel.sellingPrice)}</span></div>
                                    <div className="flex justify-between text-slate-400"><span>GST ({panel.taxRate}%)</span><span className="text-slate-300">₹{fmt(panel.taxAmount)}</span></div>
                                    <div className="flex justify-between font-bold text-slate-100 border-t border-slate-700 pt-2 text-base"><span>Grand Total</span><span>₹{fmt(panel.grandTotal)}</span></div>
                                    <div className="flex justify-between text-slate-400 pt-1"><span>Advance Received</span><span className="text-emerald-400">₹{fmt(panel.advanceReceived)}</span></div>
                                    <div className="flex justify-between font-semibold border-t border-slate-700 pt-2"><span className="text-slate-300">Balance Due</span><span className={Number(panel.grandTotal) - Number(panel.advanceReceived) > 0 ? 'text-amber-400' : 'text-emerald-400'}>₹{fmt(Number(panel.grandTotal) - Number(panel.advanceReceived))}</span></div>
                                </div>
                            </div>

                            {/* Margin Analysis */}
                            <div className={`rounded-xl p-4 ${margin >= 0 ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-red-900/20 border border-red-700/30'}`}>
                                <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Profit Margin</p>
                                <p className={`text-2xl font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{fmt(margin)} <span className="text-sm">({marginPct.toFixed(1)}%)</span></p>
                            </div>

                            {/* Payment Status */}
                            <div className="bg-slate-800 rounded-xl p-4">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Payment Status</p>
                                <select
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                                    value={panel.paymentStatus}
                                    onChange={(e) => handlePaymentChange(e.target.value)}
                                >
                                    <option value="UNPAID">UNPAID</option>
                                    <option value="PARTIAL">PARTIAL</option>
                                    <option value="PAID">PAID</option>
                                </select>
                                <p className={`text-sm font-semibold mt-2 ${PAYMENT_COLORS[panel.paymentStatus]}`}>
                                    {panel.paymentStatus === 'PAID' ? '✓ Fully Paid' : panel.paymentStatus === 'PARTIAL' ? `⚠ Partial — Balance: ₹${fmt(Number(panel.grandTotal) - Number(panel.advanceReceived))}` : `✗ Unpaid — ₹${fmt(panel.grandTotal)} due`}
                                </p>
                            </div>

                            {/* Challan / Invoice Numbers */}
                            <div className="bg-slate-800 rounded-xl p-4 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Delivery Challan No.</p>
                                    <p className="text-sm text-slate-200">{panel.deliveryChallanNumber || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Invoice No.</p>
                                    <p className="text-sm text-slate-200">{panel.invoiceNumber || '—'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === AUDIT TRAIL TAB === */}
                    {activeTab === 'audit' && (
                        <div className="space-y-4">
                            {/* Date Summary */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Order Booked', date: panel.orderDate },
                                    { label: 'Target Delivery', date: panel.targetDeliveryDate },
                                    { label: 'Completed', date: panel.completedDate },
                                    { label: 'Delivered', date: panel.deliveredDate },
                                ].map((d) => (
                                    <div key={d.label} className="bg-slate-800 rounded-xl p-3">
                                        <p className="text-xs text-slate-500 mb-0.5">{d.label}</p>
                                        <p className={`text-sm font-medium ${d.date ? 'text-slate-200' : 'text-slate-600'}`}>
                                            {d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Audit Timeline */}
                            <div>
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Activity Timeline</h4>
                                {panel.auditLogs && panel.auditLogs.length > 0 ? (
                                    <div className="relative">
                                        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />
                                        <div className="space-y-4">
                                            {panel.auditLogs.map((log) => (
                                                <div key={log.id} className="relative pl-10">
                                                    <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-violet-600 border-2 border-slate-900 ring-2 ring-violet-500/30" />
                                                    <div className="bg-slate-800 rounded-xl p-3">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">{log.action.replace(/_/g, ' ')}</span>
                                                            <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-300">{log.description}</p>
                                                        <p className="text-xs text-slate-500 mt-1">by {log.performedBy}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <Clock size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">No audit logs yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
