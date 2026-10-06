import React, { useState } from 'react';
import { X, Factory, User, Phone, Mail, Building2, MapPin, FileText, DollarSign, Calendar, Cpu } from 'lucide-react';
import { useCreatePanelProject, type PanelType, type CreatePanelPayload } from '../api/panelsApi';

interface CreatePanelOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PANEL_TYPES: { value: PanelType; label: string }[] = [
    { value: 'PLC_PANEL', label: 'PLC Panel' },
    { value: 'MCC_PANEL', label: 'MCC Panel (Motor Control Centre)' },
    { value: 'APFC_PANEL', label: 'APFC Panel (Power Factor Correction)' },
    { value: 'HMI_PANEL', label: 'HMI Panel' },
    { value: 'VFD_PANEL', label: 'VFD Panel' },
    { value: 'POWER_DISTRIBUTION_PANEL', label: 'Power Distribution Panel (PDB)' },
    { value: 'CUSTOM_PANEL', label: 'Custom Panel' },
];

export const CreatePanelOrderModal: React.FC<CreatePanelOrderModalProps> = ({ isOpen, onClose }) => {
    const createPanel = useCreatePanelProject();

    const [form, setForm] = useState<CreatePanelPayload>({
        clientName: '',
        companyName: '',
        clientPhone: '',
        clientEmail: '',
        clientGstin: '',
        siteAddress: '',
        panelType: 'PLC_PANEL',
        panelDescription: '',
        assignedEngineer: '',
        priority: 'NORMAL',
        notes: '',
        sellingPrice: 0,
        laborCost: 0,
        otherCosts: 0,
        taxRate: 18,
        advanceReceived: 0,
        targetDeliveryDate: '',
    });

    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const set = (field: keyof CreatePanelPayload, value: any) =>
        setForm((f) => ({ ...f, [field]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clientName.trim()) return showToast('error', 'Client name is required.');
        if (!form.clientPhone.trim()) return showToast('error', 'Client phone is required.');
        if (!form.panelDescription.trim()) return showToast('error', 'Panel description is required.');

        createPanel.mutate(
            {
                ...form,
                targetDeliveryDate: form.targetDeliveryDate || undefined,
            },
            {
                onSuccess: () => {
                    showToast('success', 'Panel order booked successfully!');
                    setTimeout(() => {
                        onClose();
                        setForm({
                            clientName: '', companyName: '', clientPhone: '', clientEmail: '',
                            clientGstin: '', siteAddress: '', panelType: 'PLC_PANEL',
                            panelDescription: '', assignedEngineer: '', priority: 'NORMAL',
                            notes: '', sellingPrice: 0, laborCost: 0, otherCosts: 0,
                            taxRate: 18, advanceReceived: 0, targetDeliveryDate: '',
                        });
                    }, 1000);
                },
                onError: (err: any) => {
                    showToast('error', err?.response?.data?.error || 'Failed to create panel order.');
                },
            }
        );
    };

    if (!isOpen) return null;

    const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors';
    const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    <span>{toast.type === 'success' ? '✓' : '✗'}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                            <Factory size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-100">New Panel Order</h2>
                            <p className="text-xs text-slate-500">Book a custom panel manufacturing project</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Client Info */}
                    <div>
                        <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2"><User size={14} /> Client Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Client Name *</label>
                                <input className={inputCls} placeholder="Contact person name" value={form.clientName} onChange={(e) => set('clientName', e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelCls}>Company Name</label>
                                <input className={inputCls} placeholder="Company / Plant name" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}><Phone size={10} className="inline mr-1" />Phone *</label>
                                <input className={inputCls} placeholder="+91 98765 43210" value={form.clientPhone} onChange={(e) => set('clientPhone', e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelCls}><Mail size={10} className="inline mr-1" />Email</label>
                                <input className={inputCls} type="email" placeholder="client@company.com" value={form.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}><Building2 size={10} className="inline mr-1" />GST No.</label>
                                <input className={inputCls} placeholder="27AAAAA0000A1Z5" value={form.clientGstin} onChange={(e) => set('clientGstin', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}><MapPin size={10} className="inline mr-1" />Site Address</label>
                                <input className={inputCls} placeholder="Installation site" value={form.siteAddress} onChange={(e) => set('siteAddress', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Panel Specs */}
                    <div>
                        <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2"><Cpu size={14} /> Panel Specifications</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Panel Type *</label>
                                <select className={inputCls} value={form.panelType} onChange={(e) => set('panelType', e.target.value as PanelType)}>
                                    {PANEL_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Priority</label>
                                <select className={inputCls} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                                    <option value="NORMAL">Normal</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}><FileText size={10} className="inline mr-1" />Panel Description *</label>
                                <textarea className={`${inputCls} resize-none`} rows={3} placeholder="e.g. 3-Phase MCC with 8 feeders, DOL starters, bus bar rating 400A for textile plant..." value={form.panelDescription} onChange={(e) => set('panelDescription', e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelCls}>Assigned Engineer</label>
                                <input className={inputCls} placeholder="Engineer / Technician name" value={form.assignedEngineer} onChange={(e) => set('assignedEngineer', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}><Calendar size={10} className="inline mr-1" />Target Delivery Date</label>
                                <input className={inputCls} type="date" value={form.targetDeliveryDate} onChange={(e) => set('targetDeliveryDate', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Financials */}
                    <div>
                        <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2"><DollarSign size={14} /> Financials</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Selling Price (₹)</label>
                                <input className={inputCls} type="number" min="0" step="0.01" placeholder="0.00" value={form.sellingPrice || ''} onChange={(e) => set('sellingPrice', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className={labelCls}>Labour Cost (₹)</label>
                                <input className={inputCls} type="number" min="0" step="0.01" placeholder="0.00" value={form.laborCost || ''} onChange={(e) => set('laborCost', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className={labelCls}>Other Costs (₹)</label>
                                <input className={inputCls} type="number" min="0" step="0.01" placeholder="0.00" value={form.otherCosts || ''} onChange={(e) => set('otherCosts', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className={labelCls}>GST Rate (%)</label>
                                <select className={inputCls} value={form.taxRate} onChange={(e) => set('taxRate', parseFloat(e.target.value))}>
                                    <option value={0}>0%</option>
                                    <option value={5}>5%</option>
                                    <option value={12}>12%</option>
                                    <option value={18}>18% (Default)</option>
                                    <option value={28}>28%</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Advance Received (₹)</label>
                                <input className={inputCls} type="number" min="0" step="0.01" placeholder="0.00" value={form.advanceReceived || ''} onChange={(e) => set('advanceReceived', parseFloat(e.target.value) || 0)} />
                            </div>
                        </div>

                        {/* Live preview */}
                        {(form.sellingPrice || 0) > 0 && (
                            <div className="mt-3 bg-slate-800 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                                <div className="flex justify-between"><span>Selling Price</span><span className="text-slate-200">₹{Number(form.sellingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between"><span>GST ({form.taxRate}%)</span><span className="text-slate-200">₹{(Number(form.sellingPrice || 0) * (form.taxRate || 18) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between font-semibold text-slate-100 border-t border-slate-700 pt-1 mt-1"><span>Grand Total</span><span>₹{(Number(form.sellingPrice || 0) * (1 + (form.taxRate || 18) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={labelCls}>Additional Notes</label>
                        <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Special instructions, customer requirements, etc." value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={createPanel.isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                            {createPanel.isPending ? (
                                <><span className="animate-spin">⟳</span> Booking...</>
                            ) : (
                                <><Factory size={15} /> Book Panel Order</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
