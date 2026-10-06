import React, { useState, useEffect } from 'react';
import {
    X, Wrench, User, Phone, CheckCircle2, AlertTriangle,
    Plus, Trash2, Save, Send, Printer, Copy, Check,
    Clock, Tag, FileText, DollarSign, ShieldCheck, Layers, Loader2,
    History, PackageCheck, ShoppingCart, Info, AlertCircle
} from 'lucide-react';
import {
    type Repair,
    type RepairStatus,
    useGetRepairDetails,
    useGetRepairAuditLogs,
    useUpdateRepair,
    useAddRepairPart,
    useDeleteRepairPart
} from '../api/repairsApi';
import { useGetProducts, type Product } from '../api/productsApi';

interface RepairDetailsModalProps {
    repairId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

const STATUS_STEPS: { key: RepairStatus; label: string; color: string }[] = [
    { key: 'RECEIVED', label: '1. Received', color: 'bg-blue-500' },
    { key: 'IN_DIAGNOSIS', label: '2. In Diagnosis', color: 'bg-indigo-500' },
    { key: 'ESTIMATION_SENT', label: '3. Quote Sent', color: 'bg-amber-500' },
    { key: 'IN_REPAIR', label: '4. In Repair', color: 'bg-orange-500' },
    { key: 'TESTING', label: '5. Bench Testing', color: 'bg-purple-500' },
    { key: 'READY_FOR_PICKUP', label: '6. Ready for Pickup', color: 'bg-emerald-500' },
    { key: 'DELIVERED', label: '7. Delivered / Closed', color: 'bg-teal-500' },
];

export const RepairDetailsModal: React.FC<RepairDetailsModalProps> = ({
    repairId,
    isOpen,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<'diagnosis' | 'parts' | 'billing' | 'audit' | 'intimation'>('diagnosis');
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [copiedWa, setCopiedWa] = useState(false);

    // Queries & Mutations
    const { data: repair, isLoading } = useGetRepairDetails(repairId || undefined);
    const { data: auditLogs = [] } = useGetRepairAuditLogs(repairId || undefined);
    const { data: storeProducts = [] } = useGetProducts();

    const updateRepairMutation = useUpdateRepair();
    const addPartMutation = useAddRepairPart();
    const deletePartMutation = useDeleteRepairPart();

    // Local form state
    const [status, setStatus] = useState<RepairStatus>('RECEIVED');
    const [assignedTechnician, setAssignedTechnician] = useState('');
    const [diagnosisObservations, setDiagnosisObservations] = useState('');
    const [isRepairable, setIsRepairable] = useState('YES');
    const [repairNotes, setRepairNotes] = useState('');
    const [serviceCharge, setServiceCharge] = useState<number>(0);
    const [taxRate, setTaxRate] = useState<number>(18);
    const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID' | 'PARTIAL'>('UNPAID');
    const [warrantyMonths, setWarrantyMonths] = useState<number>(1);
    const [deliveryChallanNumber, setDeliveryChallanNumber] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');

    // New Part form state
    const [partSource, setPartSource] = useState<'STORE_INVENTORY' | 'NEEDS_PROCUREMENT'>('STORE_INVENTORY');
    const [selectedStoreProductId, setSelectedStoreProductId] = useState<number | ''>('');
    const [newPartName, setNewPartName] = useState('');
    const [newPartNumber, setNewPartNumber] = useState('');
    const [newPartQty, setNewPartQty] = useState<number>(1);
    const [newPartCost, setNewPartCost] = useState<number>(0);

    // Toast auto-dismiss helper
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Sync repair data when loaded
    useEffect(() => {
        if (repair) {
            setStatus(repair.status);
            setAssignedTechnician(repair.assignedTechnician || '');
            setDiagnosisObservations(repair.diagnosisObservations || '');
            setIsRepairable(repair.isRepairable || 'YES');
            setRepairNotes(repair.repairNotes || '');
            setServiceCharge(Number(repair.serviceCharge) || 0);
            setTaxRate(Number(repair.taxRate) || 18);
            setPaymentStatus(repair.paymentStatus || 'UNPAID');
            setWarrantyMonths(repair.warrantyMonths ?? 1);
            setDeliveryChallanNumber(repair.deliveryChallanNumber || '');
            setInvoiceNumber(repair.invoiceNumber || '');
        }
    }, [repair]);

    // Handle selecting a product from store inventory dropdown
    const handleSelectStoreProduct = (prodId: number | '') => {
        setSelectedStoreProductId(prodId);
        if (prodId === '') {
            setNewPartName('');
            setNewPartNumber('');
            setNewPartCost(0);
            return;
        }
        const product = storeProducts.find((p) => p.id === prodId);
        if (product) {
            setNewPartName(`${product.brand} ${product.modelNumber}`);
            setNewPartNumber(product.sku || product.serialNumber || '');
            setNewPartCost(Number(product.costPrice) || Number(product.unitPrice) || 0);
        }
    };

    if (!isOpen || !repairId) return null;

    // Financial calculations
    const partsTotal = (repair?.parts || []).reduce(
        (acc, p) => acc + Number(p.totalCost),
        0
    );
    const subtotal = serviceCharge + partsTotal;
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount;

    // Save changes
    const handleSaveChanges = () => {
        if (!repair) return;
        updateRepairMutation.mutate(
            {
                id: repair.id,
                status,
                assignedTechnician: assignedTechnician || undefined,
                diagnosisObservations: diagnosisObservations || undefined,
                isRepairable,
                repairNotes: repairNotes || undefined,
                serviceCharge,
                taxRate,
                taxAmount,
                grandTotal,
                paymentStatus,
                warrantyMonths,
                deliveryChallanNumber: deliveryChallanNumber || undefined,
                invoiceNumber: invoiceNumber || undefined,
            },
            {
                onSuccess: () => {
                    showToast('✅ Job-Card changes saved & audit log recorded!');
                },
                onError: (err: any) => {
                    showToast(`⚠️ ${err.response?.data?.error || 'Failed to save changes'}`, 'error');
                },
            }
        );
    };

    // Add spare part
    const handleAddPart = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPartName.trim()) return;

        addPartMutation.mutate(
            {
                repairId: repair!.id,
                productId: partSource === 'STORE_INVENTORY' && selectedStoreProductId ? Number(selectedStoreProductId) : undefined,
                partName: newPartName.trim(),
                partNumber: newPartNumber.trim() || undefined,
                source: partSource,
                quantity: newPartQty,
                unitCost: newPartCost,
            },
            {
                onSuccess: () => {
                    showToast(
                        partSource === 'STORE_INVENTORY' && selectedStoreProductId
                            ? '✅ Spare part added & deducted from store inventory!'
                            : '✅ Spare part logged for procurement!'
                    );
                    setSelectedStoreProductId('');
                    setNewPartName('');
                    setNewPartNumber('');
                    setNewPartQty(1);
                    setNewPartCost(0);
                },
                onError: (err: any) => {
                    showToast(`⚠️ ${err.response?.data?.error || 'Failed to add part'}`, 'error');
                },
            }
        );
    };

    const handleDeletePart = (partId: number) => {
        deletePartMutation.mutate(
            {
                repairId: repair!.id,
                partId,
            },
            {
                onSuccess: () => {
                    showToast('✅ Part removed and store inventory restored!');
                },
            }
        );
    };

    // WhatsApp message generator
    const generateWhatsAppMessage = () => {
        if (!repair) return '';
        const client = repair.companyName ? `${repair.companyName} (${repair.customerName})` : repair.customerName;
        let msg = `*GURUKIRPA AUTOMATION - SERVICE UPDATE*\n\n`;
        msg += `Dear *${client}*,\n`;
        msg += `Your equipment *${repair.brand} ${repair.modelNumber}* (Serial: *${repair.serialNumber}*) has been inspected.\n\n`;
        msg += `📋 *Job Card No:* ${repair.jobCardNumber}\n`;
        msg += `⚡ *Status:* ${status.replace('_', ' ')}\n`;

        if (status === 'READY_FOR_PICKUP' || status === 'DELIVERED') {
            msg += `💰 *Total Bill:* ₹${grandTotal.toLocaleString('en-IN')}\n`;
            msg += `🛡️ *Warranty:* ${warrantyMonths} Month(s) Testing Warranty\n\n`;
            msg += `The unit has passed motor bench testing. Please arrange for collection from our workshop.\n`;
        } else if (status === 'ESTIMATION_SENT') {
            msg += `💰 *Estimated Repair Quote:* ₹${Number(repair.estimatedCost).toLocaleString('en-IN')}\n`;
            msg += `Please confirm approval to proceed with repair.\n`;
        } else if (status === 'UNREPAIRABLE_RETURN') {
            msg += `⚠️ *Inspection Result:* Equipment cannot be repaired economically.\n`;
            msg += `Please collect the unit on return delivery challan.\n`;
        }

        msg += `\nThank you,\n*Gurukirpa Automation Team*`;
        return msg;
    };

    const handleCopyWhatsApp = () => {
        const text = generateWhatsAppMessage();
        navigator.clipboard.writeText(text);
        setCopiedWa(true);
        showToast('✅ WhatsApp message copied to clipboard!');
        setTimeout(() => setCopiedWa(false), 2500);
    };

    const handleOpenWhatsApp = () => {
        const text = encodeURIComponent(generateWhatsAppMessage());
        const phone = repair?.customerPhone.replace(/[^0-9]/g, '') || '';
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4">
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl max-h-[94vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100 relative">

                {/* Floating Toast Alert Banner */}
                {toastMessage && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-200">
                        <div
                            className={`px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2 ${toastMessage.type === 'success'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20'
                                    : 'bg-red-950 text-red-300 border-red-500/50 shadow-red-500/20'
                                }`}
                        >
                            {toastMessage.type === 'success' ? (
                                <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : (
                                <AlertCircle size={16} className="text-red-400" />
                            )}
                            {toastMessage.text}
                        </div>
                    </div>
                )}

                {/* Modal Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-900 sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                                {repair?.jobCardNumber || `JOB-${repairId}`}
                            </span>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${repair?.priority === 'URGENT'
                                        ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                                        : repair?.priority === 'HIGH'
                                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                            : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                    }`}
                            >
                                {repair?.priority} PRIORITY
                            </span>
                            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                {repair?.brand} &bull; {repair?.deviceType}
                            </span>
                        </div>

                        <h2 className="text-base font-bold text-slate-100 mt-1 flex items-center gap-2">
                            <span>{repair?.modelNumber}</span>
                            <span className="text-xs text-slate-400 font-mono font-normal">
                                (SN: {repair?.serialNumber})
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400">
                            Client:{' '}
                            <span className="text-slate-200 font-semibold">
                                {repair?.companyName ? `${repair.companyName} - ` : ''}
                                {repair?.customerName}
                            </span>{' '}
                            | Phone: <span className="font-mono text-slate-300">{repair?.customerPhone}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSaveChanges}
                            disabled={updateRepairMutation.isPending}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 active:scale-95 transition-transform"
                        >
                            {updateRepairMutation.isPending ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            Save Job
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Progress Status Bar */}
                <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 min-w-max">
                        {STATUS_STEPS.map((step) => {
                            const isCurrent = status === step.key;
                            return (
                                <button
                                    key={step.key}
                                    type="button"
                                    onClick={() => {
                                        setStatus(step.key);
                                        showToast(`Status selected: ${step.label}. Remember to click Save Job!`);
                                    }}
                                    className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 ${isCurrent
                                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-extrabold'
                                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    {isCurrent && <Check size={12} />}
                                    {step.label}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => {
                                setStatus('UNREPAIRABLE_RETURN');
                                showToast('Status selected: Unrepairable / Return. Click Save Job!');
                            }}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all ${status === 'UNREPAIRABLE_RETURN'
                                    ? 'bg-red-500 text-white border-red-400 font-extrabold'
                                    : 'bg-slate-900 text-red-400 border-slate-800 hover:border-red-500/40'
                                }`}
                        >
                            Unrepairable / Return
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="px-4 border-b border-slate-800 flex gap-2 bg-slate-900/50 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('diagnosis')}
                        className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'diagnosis'
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Wrench size={14} /> Diagnosis & Notes
                    </button>

                    <button
                        onClick={() => setActiveTab('parts')}
                        className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'parts'
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Layers size={14} /> Replaced Spares & Store Stock ({(repair?.parts || []).length})
                    </button>

                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'billing'
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <DollarSign size={14} /> Billing, Tax & Challan
                    </button>

                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'audit'
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <History size={14} /> Audit Trail & Dates ({auditLogs.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('intimation')}
                        className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'intimation'
                                ? 'border-emerald-500 text-emerald-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Send size={14} /> WhatsApp & Sticker
                    </button>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="animate-spin mb-2 text-emerald-400" size={32} />
                            <p className="text-xs">Loading job-card details...</p>
                        </div>
                    ) : activeTab === 'diagnosis' ? (
                        /* TAB 1: Diagnosis & Technical Observations */
                        <div className="space-y-4">
                            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                    <AlertTriangle size={12} /> Customer Inward Reported Fault:
                                </span>
                                <p className="text-xs text-slate-200">{repair?.reportedFault}</p>
                                {repair?.physicalCondition && (
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Condition: {repair.physicalCondition}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Assigned Technician / Engineer
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Harpreet Singh / Gurpreet"
                                        value={assignedTechnician}
                                        onChange={(e) => setAssignedTechnician(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Repairable Status
                                    </label>
                                    <select
                                        value={isRepairable}
                                        onChange={(e) => setIsRepairable(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                    >
                                        <option value="YES">YES - Unit is Repairable</option>
                                        <option value="PENDING">PENDING - Awaiting Component Availability</option>
                                        <option value="NO">NO - Unrepairable / ASIC Blown / Beyond Economic Repair</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Diagnostic Inspection & Root Cause
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Blown IGBT module on phase U-V, blown Gate driver IC (HCPL-3120), DC Bus capacitor ESR high"
                                    value={diagnosisObservations}
                                    onChange={(e) => setDiagnosisObservations(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Repair Work Summary & Bench Testing Notes
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Replaced IGBT module and gate drivers. Tested on 15kW motor test bench for 3 hours at 50Hz load. Temperatures normal."
                                    value={repairNotes}
                                    onChange={(e) => setRepairNotes(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    ) : activeTab === 'parts' ? (
                        /* TAB 2: Replaced Spare Parts & Store Inventory Sync */
                        <div className="space-y-4">
                            {/* Part Source Mode Selector */}
                            <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Plus size={14} /> Log Spare Part & Update Store Stock
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPartSource('STORE_INVENTORY')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${partSource === 'STORE_INVENTORY'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                                }`}
                                        >
                                            📦 Pick From Store Inventory
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPartSource('NEEDS_PROCUREMENT');
                                                setSelectedStoreProductId('');
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${partSource === 'NEEDS_PROCUREMENT'
                                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                                }`}
                                        >
                                            🛒 Needs Order / Custom Part
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleAddPart} className="space-y-2.5">
                                    {partSource === 'STORE_INVENTORY' && (
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                                Select Spare Part from Store Inventory:
                                            </label>
                                            <select
                                                value={selectedStoreProductId}
                                                onChange={(e) =>
                                                    handleSelectStoreProduct(
                                                        e.target.value ? Number(e.target.value) : ''
                                                    )
                                                }
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                            >
                                                <option value="">-- Choose item from store catalog --</option>
                                                {storeProducts.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.brand} {p.modelNumber} &bull; Stock: {p.stock} units &bull; ₹{Number(p.costPrice || p.unitPrice)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                        <div className="sm:col-span-2">
                                            <input
                                                type="text"
                                                placeholder="Part Name (e.g. Semikron IGBT Module 150A)"
                                                value={newPartName}
                                                onChange={(e) => setNewPartName(e.target.value)}
                                                required
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Part # / SKU (e.g. SKM150GB12T4)"
                                                value={newPartNumber}
                                                onChange={(e) => setNewPartNumber(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Qty"
                                                value={newPartQty}
                                                onChange={(e) => setNewPartQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                className="w-16 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-center text-slate-100 focus:outline-none"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Unit ₹"
                                                value={newPartCost}
                                                onChange={(e) => setNewPartCost(Math.max(0, parseFloat(e.target.value) || 0))}
                                                className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-right text-slate-100 focus:outline-none"
                                            />
                                            <button
                                                type="submit"
                                                disabled={addPartMutation.isPending}
                                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
                                            >
                                                {addPartMutation.isPending ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Plus size={16} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Parts List Table */}
                            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                                {!repair?.parts || repair.parts.length === 0 ? (
                                    <div className="py-8 text-center text-slate-500 text-xs">
                                        No spare parts logged yet.
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-800/80 text-slate-400 border-b border-slate-800">
                                                <th className="py-2.5 px-3">Part Description</th>
                                                <th className="py-2.5 px-3">Source & SKU</th>
                                                <th className="py-2.5 px-3 text-center">Qty</th>
                                                <th className="py-2.5 px-3 text-right">Unit Price</th>
                                                <th className="py-2.5 px-3 text-right">Total (₹)</th>
                                                <th className="py-2.5 px-3 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {repair.parts.map((p) => (
                                                <tr key={p.id} className="hover:bg-slate-900/60">
                                                    <td className="py-2.5 px-3 font-semibold text-slate-100">
                                                        {p.partName}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-400">
                                                        <span
                                                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${p.source === 'STORE_INVENTORY'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                                }`}
                                                        >
                                                            {p.source === 'STORE_INVENTORY' ? 'Store Stock' : 'Needs Order'}
                                                        </span>
                                                        <span className="font-mono text-[11px]">{p.partNumber || '-'}</span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center font-bold text-slate-200">
                                                        {p.quantity}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-slate-400">
                                                        ₹{Number(p.unitCost).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                                        ₹{Number(p.totalCost).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <button
                                                            onClick={() => handleDeletePart(p.id)}
                                                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                                            title="Delete Part & Restore Stock"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-900 border-t border-slate-800 font-bold">
                                                <td colSpan={4} className="py-2.5 px-3 text-right text-slate-300">
                                                    Total Spares Cost:
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-emerald-400">
                                                    ₹{partsTotal.toLocaleString('en-IN')}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'billing' ? (
                        /* TAB 3: Financials & Delivery Challan */
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Service / Labor Charges (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={serviceCharge}
                                        onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        GST Tax Rate (%)
                                    </label>
                                    <select
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                    >
                                        <option value={18}>18% (Standard GST)</option>
                                        <option value={28}>28%</option>
                                        <option value={12}>12%</option>
                                        <option value={0}>0% (Exempt / Challan)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Payment Status
                                    </label>
                                    <select
                                        value={paymentStatus}
                                        onChange={(e) => setPaymentStatus(e.target.value as any)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                    >
                                        <option value="PAID">PAID (Full Settlement)</option>
                                        <option value="PARTIAL">PARTIAL (Advance Received)</option>
                                        <option value="UNPAID">UNPAID (Pending)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Repair Testing Warranty
                                    </label>
                                    <select
                                        value={warrantyMonths}
                                        onChange={(e) => setWarrantyMonths(parseInt(e.target.value, 10) || 1)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                    >
                                        <option value={1}>1 Month Testing Warranty</option>
                                        <option value={3}>3 Months Warranty</option>
                                        <option value={6}>6 Months Warranty</option>
                                        <option value={0}>No Warranty</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Delivery Challan Number (For Store Outward)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CHAL-2026-081"
                                        value={deliveryChallanNumber}
                                        onChange={(e) => setDeliveryChallanNumber(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Tax Invoice Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. INV-2026-0042"
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs mt-3">
                                <div className="flex justify-between text-slate-400">
                                    <span>Replaced Parts Total:</span>
                                    <span>₹{partsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>Service / Labor Charges:</span>
                                    <span>₹{serviceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>GST Tax ({taxRate}%):</span>
                                    <span>₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold text-slate-100 pt-2 border-t border-slate-800">
                                    <span>Grand Total:</span>
                                    <span className="text-emerald-400">
                                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'audit' ? (
                        /* TAB 4: Audit Trail & Timeline History */
                        <div className="space-y-4">
                            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <History size={14} /> Chronological Audit Logs & In/Out Dates
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 mb-4 text-xs">
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Inward Received:</span>
                                        <span className="font-bold text-slate-200">
                                            {repair?.receivedDate ? new Date(repair.receivedDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Target Delivery:</span>
                                        <span className="font-bold text-slate-200">
                                            {repair?.estimatedDeliveryDate ? new Date(repair.estimatedDeliveryDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Testing Completed:</span>
                                        <span className="font-bold text-emerald-400">
                                            {repair?.completedDate ? new Date(repair.completedDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'In Progress'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Outward Delivered:</span>
                                        <span className="font-bold text-teal-400">
                                            {repair?.deliveredDate ? new Date(repair.deliveredDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Pending Collection'}
                                        </span>
                                    </div>
                                </div>

                                {auditLogs.length === 0 ? (
                                    <div className="py-6 text-center text-slate-500 text-xs">
                                        No audit logs recorded yet.
                                    </div>
                                ) : (
                                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                                        {auditLogs.map((log) => (
                                            <div key={log.id} className="flex items-start gap-3 relative">
                                                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 z-10 text-emerald-400">
                                                    <Clock size={13} />
                                                </div>
                                                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-slate-200 uppercase text-[10px] tracking-wider">
                                                            {log.action.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-mono">
                                                            {new Date(log.createdAt).toLocaleString('en-IN', {
                                                                dateStyle: 'medium',
                                                                timeStyle: 'short',
                                                            })}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-300 text-xs mt-1">{log.description}</p>
                                                    {log.performedBy && (
                                                        <p className="text-[10px] text-slate-500 mt-1">
                                                            By: <span className="text-slate-400">{log.performedBy}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* TAB 5: WhatsApp Intimation & Sticker */
                        <div className="space-y-4">
                            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Send size={14} /> 1-Click WhatsApp Customer Message
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCopyWhatsApp}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                                        >
                                            {copiedWa ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                            {copiedWa ? 'Copied!' : 'Copy Text'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleOpenWhatsApp}
                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-500/10 transition-all active:scale-95"
                                        >
                                            <Send size={14} /> Send on WhatsApp
                                        </button>
                                    </div>
                                </div>

                                <textarea
                                    readOnly
                                    rows={8}
                                    value={generateWhatsAppMessage()}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300/90 leading-relaxed focus:outline-none"
                                />
                            </div>

                            {/* Workshop Job Ticket / Chassis Sticker Preview */}
                            <div className="bg-slate-950 border-2 border-dashed border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                    <div>
                                        <h4 className="font-bold text-slate-100 text-sm">
                                            GURUKIRPA AUTOMATION - WORKSHOP TICKET
                                        </h4>
                                        <p className="text-[10px] text-slate-400">Industrial Drive & Controller Repair</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono font-bold text-emerald-400 text-sm">
                                            {repair?.jobCardNumber}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                    <div>
                                        <span className="text-slate-500 block">Customer:</span>
                                        <span className="text-slate-200 font-bold">{repair?.customerName}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">Company:</span>
                                        <span className="text-slate-200 font-bold">{repair?.companyName || 'Individual'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">Equipment:</span>
                                        <span className="text-slate-200 font-bold">{repair?.brand} {repair?.modelNumber}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">Serial Number:</span>
                                        <span className="text-slate-200 font-mono font-bold">{repair?.serialNumber}</span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                                    <span>Received: {repair?.receivedDate ? new Date(repair.receivedDate).toLocaleDateString('en-IN') : '-'}</span>
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                                    >
                                        <Printer size={12} /> Print Physical Chassis Sticker
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
