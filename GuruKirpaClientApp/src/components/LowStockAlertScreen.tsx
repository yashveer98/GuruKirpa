import React, { useState, useMemo } from 'react';
import {
    AlertTriangle, XCircle, ArrowLeft, PackagePlus, Copy, Check,
    Printer, Building2, RefreshCw, Loader2, FileSpreadsheet,
    ChevronDown, ChevronUp, SlidersHorizontal, ArrowUpRight
} from 'lucide-react';
import { type Product, useGetLowStockProducts } from '../api/productsApi';
import { StockAdjustmentModal } from './StockAdjustmentModal';

interface LowStockAlertScreenProps {
    onBack?: () => void;
    onOpenInventory?: () => void;
}

interface ReorderItemState {
    [productId: number]: number; // reorder quantity
}

export const LowStockAlertScreen: React.FC<LowStockAlertScreenProps> = ({
    onBack,
    onOpenInventory,
}) => {
    const [threshold, setThreshold] = useState<number>(5);
    const [copiedBrand, setCopiedBrand] = useState<string | null>(null);
    const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
    const [collapsedBrands, setCollapsedBrands] = useState<{ [brand: string]: boolean }>({});
    const [reorderQuantities, setReorderQuantities] = useState<ReorderItemState>({});
    const [isPoModalOpen, setIsPoModalOpen] = useState(false);
    const [selectedBrandForPo, setSelectedBrandForPo] = useState<string>('ALL');

    // Query low stock products
    const { data: rawLowStock, isLoading, isError, refetch, isFetching } = useGetLowStockProducts(threshold);
    const lowStockProducts = Array.isArray(rawLowStock) ? rawLowStock : [];

    // Initialize default reorder quantity (e.g. 10 units) if not set
    const getReorderQty = (product: Product): number => {
        if (!product.id) return 10;
        if (reorderQuantities[product.id] !== undefined) {
            return reorderQuantities[product.id];
        }
        // If 0 stock, suggest 10; if low stock, suggest 5
        return product.stock === 0 ? 10 : 5;
    };

    const updateReorderQty = (productId: number, qty: number) => {
        setReorderQuantities((prev) => ({
            ...prev,
            [productId]: Math.max(1, qty),
        }));
    };

    // Group items by brand
    const groupedByBrand = useMemo(() => {
        const groups: { [brand: string]: Product[] } = {};
        lowStockProducts.forEach((p) => {
            const brand = p.brand || 'Generic';
            if (!groups[brand]) {
                groups[brand] = [];
            }
            groups[brand].push(p);
        });
        return groups;
    }, [lowStockProducts]);

    // KPI Summary Calculations
    const metrics = useMemo(() => {
        let outOfStockCount = 0;
        let criticalLowCount = 0;
        let totalEstimatedCost = 0;

        lowStockProducts.forEach((p) => {
            const stock = Number(p.stock) || 0;
            const price = Number(p.costPrice) || Number(p.unitPrice) || 0;
            const reorderQty = getReorderQty(p);
            totalEstimatedCost += reorderQty * price;

            if (stock === 0) {
                outOfStockCount++;
            } else {
                criticalLowCount++;
            }
        });

        return {
            totalLowStock: lowStockProducts.length,
            outOfStockCount,
            criticalLowCount,
            totalBrands: Object.keys(groupedByBrand).length,
            totalEstimatedCost,
        };
    }, [lowStockProducts, reorderQuantities]);

    // Generate formatted PO Text
    const generatePoText = (targetBrand: string = 'ALL'): string => {
        const dateStr = new Date().toLocaleDateString('en-IN', {
            dateStyle: 'medium',
        });
        let text = `========================================\n`;
        text += `PURCHASE REORDER SHEET - GURUKIRPA AUTOMATION\n`;
        text += `Date: ${dateStr}\n`;
        text += `Threshold Limit: Stock <= ${threshold} units\n`;
        if (targetBrand !== 'ALL') {
            text += `Vendor / Brand: ${targetBrand.toUpperCase()}\n`;
        }
        text += `========================================\n\n`;

        const brandsToInclude =
            targetBrand === 'ALL'
                ? Object.keys(groupedByBrand)
                : [targetBrand];

        let overallTotal = 0;
        let itemIndex = 1;

        brandsToInclude.forEach((brand) => {
            const items = groupedByBrand[brand] || [];
            if (items.length === 0) return;

            text += `[ BRAND: ${brand.toUpperCase()} ]\n`;
            text += `----------------------------------------\n`;

            items.forEach((p) => {
                const reorderQty = getReorderQty(p);
                const price = Number(p.costPrice) || Number(p.unitPrice) || 0;
                const lineCost = reorderQty * price;
                overallTotal += lineCost;

                text += `${itemIndex++}. Model: ${p.modelNumber}\n`;
                text += `   Serial: ${p.serialNumber} | Type: ${p.productType?.replace('_', ' ').toUpperCase()}\n`;
                text += `   Current Stock: ${p.stock} units | REORDER: ${reorderQty} units\n`;
                if (price > 0) {
                    text += `   Est. Cost: @ Rs. ${price.toLocaleString('en-IN')} = Rs. ${lineCost.toLocaleString('en-IN')}\n`;
                }
                text += `\n`;
            });
            text += `\n`;
        });

        text += `========================================\n`;
        text += `TOTAL ESTIMATED REORDER VALUE: Rs. ${overallTotal.toLocaleString('en-IN')}\n`;
        text += `========================================\n`;

        return text;
    };

    const handleCopyPo = (brand: string) => {
        const poText = generatePoText(brand);
        navigator.clipboard.writeText(poText);
        setCopiedBrand(brand);
        setTimeout(() => setCopiedBrand(null), 2500);
    };

    const toggleBrandCollapse = (brand: string) => {
        setCollapsedBrands((prev) => ({
            ...prev,
            [brand]: !prev[brand],
        }));
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">

            {/* Top Header */}
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
                            <span>Low Stock Alert & Vendor Reordering</span>
                            <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                                {metrics.totalLowStock} Items Alert
                            </span>
                        </h1>
                        <p className="text-xs text-slate-400">
                            Monitor depleted inventory and generate distributor purchase orders
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Threshold Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs">
                        <SlidersHorizontal size={14} className="text-slate-400" />
                        <span className="text-slate-400 hidden sm:inline">Threshold: &le;</span>
                        <select
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer"
                        >
                            <option value={2} className="bg-slate-900">2 units</option>
                            <option value={5} className="bg-slate-900">5 units (Default)</option>
                            <option value={10} className="bg-slate-900">10 units</option>
                            <option value={15} className="bg-slate-900">15 units</option>
                        </select>
                    </div>

                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl border border-slate-700/60 transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw size={16} className={isFetching ? 'animate-spin text-emerald-400' : ''} />
                    </button>

                    {lowStockProducts.length > 0 && (
                        <button
                            onClick={() => {
                                setSelectedBrandForPo('ALL');
                                setIsPoModalOpen(true);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-transform active:scale-95"
                        >
                            <FileSpreadsheet size={16} /> Generate Master PO
                        </button>
                    )}
                </div>
            </header>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">

                {/* KPI Metrics Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                            <XCircle size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Out of Stock (0 units)</p>
                            <p className="text-xl font-bold text-red-400 mt-0.5">{metrics.outOfStockCount}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Urgent Low Stock (&le; {threshold})</p>
                            <p className="text-xl font-bold text-amber-400 mt-0.5">{metrics.criticalLowCount}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Building2 size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Affected Brands</p>
                            <p className="text-xl font-bold text-slate-100 mt-0.5">{metrics.totalBrands}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <ArrowUpRight size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Est. Reorder Cost</p>
                            <p className="text-xl font-bold text-emerald-400 mt-0.5">
                                ₹{metrics.totalEstimatedCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Loader2 className="animate-spin mb-2 text-emerald-400" size={32} />
                        <p className="text-xs">Scanning inventory for low-stock items...</p>
                    </div>
                ) : isError ? (
                    <div className="p-8 text-center text-red-400 text-xs bg-slate-900 rounded-2xl border border-slate-800">
                        Failed to connect to backend server.
                    </div>
                ) : lowStockProducts.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                        <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                            <Check size={28} />
                        </div>
                        <h3 className="font-bold text-base text-slate-100">All Stock Levels Healthy!</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            There are currently no products with stock &le; {threshold} units in the system.
                        </p>
                    </div>
                ) : (
                    /* Brand Grouped Cards */
                    <div className="space-y-4">
                        {Object.entries(groupedByBrand).map(([brand, items]) => {
                            const isCollapsed = collapsedBrands[brand];
                            let brandEstTotal = 0;
                            items.forEach((p) => {
                                const price = Number(p.costPrice) || Number(p.unitPrice) || 0;
                                brandEstTotal += getReorderQty(p) * price;
                            });

                            return (
                                <div
                                    key={brand}
                                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
                                >
                                    {/* Brand Header */}
                                    <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex justify-between items-center">
                                        <div
                                            onClick={() => toggleBrandCollapse(brand)}
                                            className="flex items-center gap-3 cursor-pointer select-none"
                                        >
                                            <button className="text-slate-400 hover:text-slate-200">
                                                {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                                                        {brand}
                                                    </span>
                                                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                                                        {items.length} items to reorder
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Estimated Vendor PO Cost:{' '}
                                                    <span className="text-emerald-400 font-bold">
                                                        ₹{brandEstTotal.toLocaleString('en-IN')}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Copy Brand PO */}
                                            <button
                                                onClick={() => handleCopyPo(brand)}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                                                title={`Copy Purchase Order for ${brand}`}
                                            >
                                                {copiedBrand === brand ? (
                                                    <>
                                                        <Check size={14} className="text-emerald-400" /> Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={14} /> Copy {brand} PO
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Brand Items List */}
                                    {!isCollapsed && (
                                        <div className="divide-y divide-slate-800/60">
                                            {items.map((p) => {
                                                const stock = Number(p.stock) || 0;
                                                const isOut = stock === 0;
                                                const reorderQty = getReorderQty(p);
                                                const price = Number(p.costPrice) || Number(p.unitPrice) || 0;
                                                const lineTotal = reorderQty * price;

                                                return (
                                                    <div
                                                        key={p.id}
                                                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                                                    >
                                                        {/* Product Details */}
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${isOut
                                                                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                                        }`}
                                                                >
                                                                    {isOut ? 'Out of Stock (0)' : `Low Stock: ${stock} left`}
                                                                </span>
                                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                                                    {p.productType?.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                            </div>

                                                            <h3 className="font-bold text-sm text-slate-100">
                                                                {p.modelNumber}
                                                            </h3>
                                                            <p className="text-xs text-slate-400 font-mono">
                                                                SN: {p.serialNumber} {p.sku && `| SKU: ${p.sku}`}
                                                            </p>
                                                        </div>

                                                        {/* Reorder Quantity Controls & Pricing */}
                                                        <div className="flex flex-wrap items-center gap-4 justify-between md:justify-end">
                                                            {/* Reorder Stepper */}
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                                                    Reorder Qty
                                                                </span>
                                                                <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/80 rounded-xl p-1">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={reorderQty}
                                                                        onChange={(e) =>
                                                                            updateReorderQty(
                                                                                p.id!,
                                                                                parseInt(e.target.value, 10) || 1
                                                                            )
                                                                        }
                                                                        className="w-14 bg-transparent text-center font-bold text-xs text-slate-100 focus:outline-none"
                                                                    />
                                                                    <div className="flex gap-1">
                                                                        {[5, 10, 20].map((preset) => (
                                                                            <button
                                                                                key={preset}
                                                                                type="button"
                                                                                onClick={() => updateReorderQty(p.id!, preset)}
                                                                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${reorderQty === preset
                                                                                        ? 'bg-emerald-500 text-slate-950'
                                                                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                                                    }`}
                                                                            >
                                                                                +{preset}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Cost Subtotal */}
                                                            <div className="text-right min-w-24">
                                                                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                                                                    Est. Total
                                                                </span>
                                                                <p className="text-sm font-bold text-emerald-400">
                                                                    ₹{lineTotal.toLocaleString('en-IN')}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500">
                                                                    @ ₹{price.toLocaleString('en-IN')}/u
                                                                </p>
                                                            </div>

                                                            {/* Receive / Stock In Button */}
                                                            <button
                                                                onClick={() => setSelectedProductForStock(p)}
                                                                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 active:scale-95 transition-transform"
                                                                title="Receive shipment & stock in"
                                                            >
                                                                <PackagePlus size={15} /> Receive Stock
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Master PO Preview & Copy Modal */}
            {isPoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-100">

                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                                    <FileSpreadsheet size={18} className="text-emerald-400" />
                                    Vendor Purchase Order (PO) Sheet
                                </h2>
                                <p className="text-xs text-slate-400">
                                    Formatted summary ready to send to distributors via WhatsApp or Email
                                </p>
                            </div>
                            <button
                                onClick={() => setIsPoModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-full transition-colors"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        {/* PO Content Textarea Preview */}
                        <div className="p-4 flex-1 overflow-y-auto space-y-3">
                            <textarea
                                readOnly
                                value={generatePoText(selectedBrandForPo)}
                                rows={16}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-emerald-300/90 leading-relaxed focus:outline-none"
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-800 flex gap-3">
                            <button
                                type="button"
                                onClick={() => handleCopyPo(selectedBrandForPo)}
                                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95 transition-transform"
                            >
                                {copiedBrand === selectedBrandForPo ? (
                                    <>
                                        <Check size={16} /> Copied to Clipboard!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} /> Copy Full Purchase Order
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPoModalOpen(false)}
                                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock In Modal */}
            <StockAdjustmentModal
                product={selectedProductForStock}
                isOpen={!!selectedProductForStock}
                onClose={() => setSelectedProductForStock(null)}
            />
        </div>
    );
};

