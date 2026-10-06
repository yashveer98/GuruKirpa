import React, { useState } from 'react';
import {
    X, ArrowUpRight, ArrowDownRight, AlertTriangle, Check,
    PackagePlus, History, Clock, FileText, Loader2
} from 'lucide-react';
import { type Product } from '../api/productsApi';
import {
    useAdjustStock,
    useGetStockHistory,
    type StockAdjustmentType,
} from '../api/stockApi';

interface StockAdjustmentModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
}

const ADJUSTMENT_TYPES: {
    type: StockAdjustmentType;
    label: string;
    description: string;
    isAddition: boolean;
    color: string;
    activeBorder: string;
    badgeBg: string;
}[] = [
        {
            type: 'STOCK_IN',
            label: 'Stock In',
            description: 'New inventory / Shipment arrived',
            isAddition: true,
            color: 'text-emerald-400',
            activeBorder: 'border-emerald-500 bg-emerald-500/10 text-emerald-300',
            badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        },
        {
            type: 'DAMAGE',
            label: 'Damage / Scrap',
            description: 'Broken, defective or scrapped',
            isAddition: false,
            color: 'text-red-400',
            activeBorder: 'border-red-500 bg-red-500/10 text-red-300',
            badgeBg: 'bg-red-500/20 text-red-400 border-red-500/30',
        },
        {
            type: 'CORRECTION',
            label: 'Audit Correction',
            description: 'Manual physical count adjustment',
            isAddition: true,
            color: 'text-amber-400',
            activeBorder: 'border-amber-500 bg-amber-500/10 text-amber-300',
            badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        },
        {
            type: 'STOCK_OUT',
            label: 'Stock Out',
            description: 'Manual issuance or sample',
            isAddition: false,
            color: 'text-blue-400',
            activeBorder: 'border-blue-500 bg-blue-500/10 text-blue-300',
            badgeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        },
    ];

const PRESET_AMOUNTS = [1, 5, 10, 25, 50];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
    product,
    isOpen,
    onClose,
}) => {
    const [tab, setTab] = useState<'adjust' | 'history'>('adjust');
    const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>('STOCK_IN');
    const [quantity, setQuantity] = useState<number>(1);
    const [correctionDirection, setCorrectionDirection] = useState<'ADD' | 'SUBTRACT'>('ADD');
    const [reason, setReason] = useState<string>('');

    const adjustStockMutation = useAdjustStock();
    const { data: historyData, isLoading: isHistoryLoading } = useGetStockHistory(product?.id);

    if (!isOpen || !product) return null;

    const currentTypeConfig = ADJUSTMENT_TYPES.find((t) => t.type === adjustmentType)!;

    // Calculate signed delta based on type
    const isAdding =
        adjustmentType === 'STOCK_IN'
            ? true
            : adjustmentType === 'DAMAGE' || adjustmentType === 'STOCK_OUT'
                ? false
                : correctionDirection === 'ADD';

    const signedQuantityChange = isAdding ? Math.abs(quantity) : -Math.abs(quantity);
    const resultingStock = product.stock + signedQuantityChange;
    const isInvalid = resultingStock < 0 || quantity <= 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isInvalid || !product.id) return;

        adjustStockMutation.mutate(
            {
                productId: product.id,
                adjustmentType,
                quantityChange: signedQuantityChange,
                reason: reason.trim() || undefined,
            },
            {
                onSuccess: () => {
                    setQuantity(1);
                    setReason('');
                    onClose();
                },
                onError: (err: any) => {
                    alert(err.response?.data?.error || 'Failed to adjust stock');
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-100">

                {/* Modal Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/20 uppercase">
                                {product.brand}
                            </span>
                            <span className="text-xs text-slate-400">SN: {product.serialNumber}</span>
                        </div>
                        <h2 className="text-base font-bold text-slate-100 mt-1">{product.modelNumber}</h2>
                        <p className="text-xs text-slate-400">
                            Current Stock:{' '}
                            <span className="font-bold text-emerald-400">{product.stock} units</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Navigation Tabs (Adjust vs History) */}
                <div className="flex border-b border-slate-800 bg-slate-950/50 p-1">
                    <button
                        type="button"
                        onClick={() => setTab('adjust')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${tab === 'adjust'
                                ? 'bg-slate-800 text-emerald-400 shadow-xs'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <PackagePlus size={15} /> Adjust Stock
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('history')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${tab === 'history'
                                ? 'bg-slate-800 text-emerald-400 shadow-xs'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <History size={15} /> Audit History ({historyData?.count ?? 0})
                    </button>
                </div>

                {/* Body Content */}
                {tab === 'adjust' ? (
                    <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">

                        {/* Adjustment Type Selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">Adjustment Reason / Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {ADJUSTMENT_TYPES.map((typeObj) => (
                                    <button
                                        type="button"
                                        key={typeObj.type}
                                        onClick={() => setAdjustmentType(typeObj.type)}
                                        className={`p-2.5 rounded-xl border text-left transition-all ${adjustmentType === typeObj.type
                                                ? typeObj.activeBorder
                                                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="font-bold text-xs flex items-center justify-between">
                                            <span>{typeObj.label}</span>
                                            {typeObj.isAddition ? (
                                                <ArrowUpRight size={14} className="text-emerald-400" />
                                            ) : (
                                                <ArrowDownRight size={14} className="text-red-400" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                                            {typeObj.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Special Direction selector for Correction */}
                        {adjustmentType === 'CORRECTION' && (
                            <div className="flex gap-2 p-1.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                                <button
                                    type="button"
                                    onClick={() => setCorrectionDirection('ADD')}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${correctionDirection === 'ADD'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                            : 'text-slate-400'
                                        }`}
                                >
                                    + Add to Stock
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCorrectionDirection('SUBTRACT')}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${correctionDirection === 'SUBTRACT'
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                            : 'text-slate-400'
                                        }`}
                                >
                                    - Deduct from Stock
                                </button>
                            </div>
                        )}

                        {/* Quantity Stepper & Presets */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-300">Quantity</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    inputMode="numeric"
                                    value={quantity || ''}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex gap-1.5">
                                {PRESET_AMOUNTS.map((amt) => (
                                    <button
                                        type="button"
                                        key={amt}
                                        onClick={() => setQuantity(amt)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${quantity === amt
                                                ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                                                : 'bg-slate-800 text-slate-300 border-slate-700/60 hover:border-slate-600'
                                            }`}
                                    >
                                        {amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stock Preview Banner */}
                        <div
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${resultingStock < 0
                                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                                }`}
                        >
                            <div>
                                <span className="text-slate-400">Current: </span>
                                <span className="font-bold text-slate-200">{product.stock}</span>
                                <span className="text-slate-400">
                                    {' '}
                                    {isAdding ? '+' : '-'} {quantity} units
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-bold">
                                <span>New Stock:</span>
                                <span
                                    className={`text-sm ${resultingStock < 0 ? 'text-red-400' : 'text-emerald-400'
                                        }`}
                                >
                                    {resultingStock} units
                                </span>
                            </div>
                        </div>

                        {resultingStock < 0 && (
                            <p className="text-red-400 text-xs flex items-center gap-1.5">
                                <AlertTriangle size={14} /> Stock cannot drop below 0.
                            </p>
                        )}

                        {/* Notes / Reason */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300">
                                Reference Note / Reason (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. PO-8891, Vendor Invoice, Transport Damage"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isInvalid || adjustStockMutation.isPending}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95"
                            >
                                {adjustStockMutation.isPending ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Updating Stock...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} /> Confirm Stock Adjustment
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Audit History View */
                    <div className="p-4 space-y-3 overflow-y-auto flex-1 max-h-[60vh]">
                        {isHistoryLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Loader2 className="animate-spin mb-2 text-emerald-400" size={24} />
                                <p className="text-xs">Loading audit logs...</p>
                            </div>
                        ) : !historyData?.history || historyData.history.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 text-xs">
                                No stock movement records found for this item.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {historyData.history.map((record) => {
                                    const typeObj = ADJUSTMENT_TYPES.find(
                                        (t) => t.type === record.adjustmentType
                                    );
                                    const isPositive = record.quantityChange > 0;

                                    return (
                                        <div
                                            key={record.id}
                                            className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-1.5"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${typeObj?.badgeBg || 'bg-slate-700 text-slate-300'
                                                        }`}
                                                >
                                                    {typeObj?.label || record.adjustmentType}
                                                </span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <Clock size={11} />{' '}
                                                    {new Date(record.createdAt).toLocaleString('en-IN', {
                                                        dateStyle: 'short',
                                                        timeStyle: 'short',
                                                    })}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <div className="text-slate-300">
                                                    <span>Stock change: </span>
                                                    <span className="text-slate-400">
                                                        {record.previousStock}
                                                    </span>{' '}
                                                    &rarr;{' '}
                                                    <span className="font-bold text-slate-100">
                                                        {record.newStock}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'
                                                        }`}
                                                >
                                                    {isPositive ? `+${record.quantityChange}` : record.quantityChange}
                                                </div>
                                            </div>

                                            {record.reason && (
                                                <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-700/40">
                                                    <FileText size={12} className="text-slate-500 shrink-0" />
                                                    <span className="truncate">{record.reason}</span>
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

