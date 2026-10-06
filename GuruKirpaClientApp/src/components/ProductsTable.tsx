import React, { useState, useMemo } from 'react';
import {
    Search, Plus, PackagePlus, Edit2, Trash2, AlertTriangle,
    CheckCircle2, XCircle, Package, Layers, Loader2, ArrowLeft, FileText, Wrench
} from 'lucide-react';
import {
    type Product,
    useGetProducts,
    useCreateProduct,
    useDeleteProduct
} from '../api/productsApi';
import { useAuth } from '../context/AuthContext';
import { EditProductModal } from './EditProductModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { CreateProductModal } from './CreateProductModal';

interface ProductsTableProps {
    onBack?: () => void;
    onOpenPos?: () => void;
    onOpenOrders?: () => void;
    onOpenLowStock?: () => void;
    onOpenRepairs?: () => void;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
    onBack,
    onOpenPos,
    onOpenOrders,
    onOpenLowStock,
    onOpenRepairs,
}) => {
    const { isAdmin, canManageInventory } = useAuth();
    const { data: rawProducts, isLoading, isError } = useGetProducts();
    const deleteProductMutation = useDeleteProduct();
    const createProductMutation = useCreateProduct();

    const products = Array.isArray(rawProducts) ? rawProducts : [];

    // State for Search, Filters, & Sorting
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
    const [sortBy, setSortBy] = useState<'model' | 'brand' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'>('model');

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [adjustingStockProduct, setAdjustingStockProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

    // KPI Metrics calculation
    const metrics = useMemo(() => {
        let totalUnits = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let totalValuation = 0;

        products.forEach((p) => {
            const stock = Number(p.stock) || 0;
            const price = Number(p.unitPrice) || 0;
            totalUnits += stock;
            totalValuation += stock * price;

            if (stock === 0) {
                outOfStockCount++;
            } else if (stock <= 5) {
                lowStockCount++;
            }
        });

        return {
            totalSkus: products.length,
            totalUnits,
            lowStockCount,
            outOfStockCount,
            totalValuation,
        };
    }, [products]);

    // Unique Categories
    const productTypes = useMemo(() => {
        const types = Array.from(new Set(products.map((p) => p.productType).filter(Boolean)));
        return ['ALL', ...types];
    }, [products]);

    // Filtered & Sorted Products
    const filteredProducts = useMemo(() => {
        return products
            .filter((p) => {
                // Search query
                const q = searchQuery.toLowerCase().trim();
                const matchesSearch =
                    !q ||
                    p.modelNumber.toLowerCase().includes(q) ||
                    p.brand.toLowerCase().includes(q) ||
                    p.serialNumber.toLowerCase().includes(q) ||
                    (p.sku && p.sku.toLowerCase().includes(q));

                // Type filter
                const matchesType = selectedType === 'ALL' || p.productType === selectedType;

                // Stock filter
                const stock = Number(p.stock) || 0;
                let matchesStock = true;
                if (stockFilter === 'IN_STOCK') matchesStock = stock > 5;
                else if (stockFilter === 'LOW_STOCK') matchesStock = stock > 0 && stock <= 5;
                else if (stockFilter === 'OUT_OF_STOCK') matchesStock = stock === 0;

                return matchesSearch && matchesType && matchesStock;
            })
            .sort((a, b) => {
                if (sortBy === 'model') return a.modelNumber.localeCompare(b.modelNumber);
                if (sortBy === 'brand') return a.brand.localeCompare(b.brand);
                if (sortBy === 'price_asc') return Number(a.unitPrice) - Number(b.unitPrice);
                if (sortBy === 'price_desc') return Number(b.unitPrice) - Number(a.unitPrice);
                if (sortBy === 'stock_asc') return Number(a.stock) - Number(b.stock);
                if (sortBy === 'stock_desc') return Number(b.stock) - Number(a.stock);
                return 0;
            });
    }, [products, searchQuery, selectedType, stockFilter, sortBy]);

    // Delete handler
    const handleDeleteConfirm = () => {
        if (!deletingProduct?.id) return;
        deleteProductMutation.mutate(deletingProduct.id, {
            onSuccess: () => {
                setDeletingProduct(null);
            },
            onError: (err: any) => {
                alert(err.response?.data?.error || 'Failed to delete product');
            },
        });
    };

    const handleCreateSave = (data: any) => {
        createProductMutation.mutate(data, {
            onSuccess: () => {
                setIsCreateModalOpen(false);
            },
            onError: (err: any) => {
                alert(err.response?.data?.error || 'Failed to create product');
            },
        });
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
                            <span>Inventory & Equipment Management</span>
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                {products.length} Products
                            </span>
                        </h1>
                        <p className="text-xs text-slate-400">Manage catalog, track inventory levels, and adjust stock</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {onOpenLowStock && (metrics.lowStockCount > 0 || metrics.outOfStockCount > 0) && (
                        <button
                            onClick={onOpenLowStock}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-transform active:scale-95"
                            title="Open Low Stock Alert & Reordering Center"
                        >
                            <AlertTriangle size={15} />
                            <span>Low Stock Alerts</span>
                            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-bold text-[10px]">
                                {metrics.lowStockCount + metrics.outOfStockCount}
                            </span>
                        </button>
                    )}

                    {onOpenRepairs && (
                        <button
                            onClick={onOpenRepairs}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700/60 transition-transform active:scale-95"
                        >
                            <Wrench size={15} /> Repairs
                        </button>
                    )}

                    {onOpenOrders && (
                        <button
                            onClick={onOpenOrders}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700/60 transition-transform active:scale-95"
                        >
                            <FileText size={15} /> Invoices & Orders
                        </button>
                    )}

                    {onOpenPos && (
                        <button
                            onClick={onOpenPos}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700/60 transition-transform active:scale-95"
                        >
                            Open POS
                        </button>
                    )}

                    {canManageInventory ? (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-transform active:scale-95"
                        >
                            <Plus size={16} /> Add Product
                        </button>
                    ) : (
                        <span className="bg-slate-800 text-slate-400 border border-slate-700/60 font-semibold px-3 py-1.5 rounded-xl text-xs">
                            🔒 Catalog (Read-Only)
                        </span>
                    )}
                </div>
            </header>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">

                {/* KPI Metrics Dashboard Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Layers size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Total SKUs</p>
                            <p className="text-xl font-bold text-slate-100 mt-0.5">{metrics.totalSkus}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <Package size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Total Stock Units</p>
                            <p className="text-xl font-bold text-emerald-400 mt-0.5">{metrics.totalUnits}</p>
                        </div>
                    </div>

                    {/* Clickable Low Stock Card */}
                    <div
                        onClick={onOpenLowStock}
                        className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs transition-all ${onOpenLowStock ? 'cursor-pointer hover:border-amber-500/40 hover:bg-slate-850' : ''
                            }`}
                        title="Click to open Low Stock & Vendor Reorder Center"
                    >
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                Low Stock Items
                                {onOpenLowStock && <span className="text-[10px] text-amber-400">&rarr;</span>}
                            </p>
                            <p className="text-xl font-bold text-amber-400 mt-0.5">{metrics.lowStockCount}</p>
                        </div>
                    </div>

                    {/* Clickable Out of Stock Card */}
                    <div
                        onClick={onOpenLowStock}
                        className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs transition-all ${onOpenLowStock ? 'cursor-pointer hover:border-red-500/40 hover:bg-slate-850' : ''
                            }`}
                        title="Click to open Low Stock & Vendor Reorder Center"
                    >
                        <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                            <XCircle size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                Out of Stock
                                {onOpenLowStock && <span className="text-[10px] text-red-400">&rarr;</span>}
                            </p>
                            <p className="text-xl font-bold text-red-400 mt-0.5">{metrics.outOfStockCount}</p>
                        </div>
                    </div>
                </div>

                {/* Search & Filtering Toolbar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">

                        {/* Search Bar */}
                        <div className="relative w-full md:w-80">
                            <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by model, brand, serial, SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Dropdown Filters & Sorters */}
                        <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center">

                            {/* Stock Filter */}
                            <select
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value as any)}
                                className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value="ALL">All Stock Levels</option>
                                <option value="IN_STOCK">In Stock (&gt; 5)</option>
                                <option value="LOW_STOCK">Low Stock (1 - 5)</option>
                                <option value="OUT_OF_STOCK">Out of Stock (0)</option>
                            </select>

                            {/* Category Filter */}
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                {productTypes.map((t) => (
                                    <option key={t} value={t}>
                                        {t === 'ALL' ? 'All Product Types' : t.replace('_', ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>

                            {/* Sorter */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value="model">Sort by Model (A-Z)</option>
                                <option value="brand">Sort by Brand (A-Z)</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                                <option value="stock_asc">Stock: Low to High</option>
                                <option value="stock_desc">Stock: High to Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Main Data Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="animate-spin mb-2 text-emerald-400" size={32} />
                            <p className="text-xs">Loading product inventory...</p>
                        </div>
                    ) : isError ? (
                        <div className="p-8 text-center text-red-400 text-xs">
                            Failed to connect to backend server.
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 text-xs">
                            {products.length === 0
                                ? 'No products registered yet. Click "Add Product" above to create your first item.'
                                : 'No products match your search or filter criteria.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                                        <th className="py-3.5 px-4">Item & Model</th>
                                        <th className="py-3.5 px-4">Category</th>
                                        <th className="py-3.5 px-4">Serial & SKU</th>
                                        <th className="py-3.5 px-4">Stock Status</th>
                                        <th className="py-3.5 px-4 text-right">Selling Price</th>
                                        {isAdmin && <th className="py-3.5 px-4 text-right">Cost Price</th>}
                                        <th className="py-3.5 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {filteredProducts.map((p) => {
                                        const stock = Number(p.stock) || 0;
                                        const unitPrice = Number(p.unitPrice) || 0;
                                        const costPrice = Number(p.costPrice) || 0;

                                        return (
                                            <tr
                                                key={p.id || p.serialNumber}
                                                className="hover:bg-slate-800/40 transition-colors"
                                            >
                                                {/* Item & Model */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60">
                                                            {p.brand}
                                                        </span>
                                                        <span className="font-bold text-slate-100 text-sm">{p.modelNumber}</span>
                                                    </div>
                                                </td>

                                                {/* Category */}
                                                <td className="py-3.5 px-4">
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                                                        {p.productType ? p.productType.replace('_', ' ') : 'ITEM'}
                                                    </span>
                                                </td>

                                                {/* Serial & SKU */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-mono text-slate-300">{p.serialNumber}</div>
                                                    {p.sku && <div className="text-[10px] text-slate-500 font-mono">SKU: {p.sku}</div>}
                                                </td>

                                                {/* Stock Status */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${stock === 0
                                                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                                                : stock <= 5
                                                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                                }`}
                                                        >
                                                            {stock === 0 ? (
                                                                <>
                                                                    <XCircle size={12} /> Out of Stock
                                                                </>
                                                            ) : stock <= 5 ? (
                                                                <>
                                                                    <AlertTriangle size={12} /> {stock} left (Low)
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 size={12} /> {stock} in stock
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Selling Price */}
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="font-bold text-slate-100 text-sm">
                                                        ₹{unitPrice.toLocaleString('en-IN')}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">+{p.taxRate}% GST</div>
                                                </td>

                                                {/* Cost Price (Admin Only) */}
                                                {isAdmin && (
                                                    <td className="py-3.5 px-4 text-right">
                                                        <div className="font-medium text-slate-400">
                                                            ₹{costPrice.toLocaleString('en-IN')}
                                                        </div>
                                                        {unitPrice > 0 && costPrice > 0 && (
                                                            <div className="text-[10px] text-emerald-400">
                                                                +{(((unitPrice - costPrice) / costPrice) * 100).toFixed(0)}% margin
                                                            </div>
                                                        )}
                                                    </td>
                                                )}

                                                {/* Action Buttons */}
                                                <td className="py-3.5 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {canManageInventory ? (
                                                            <>
                                                                {/* Stock In / Adjust */}
                                                                <button
                                                                    onClick={() => setAdjustingStockProduct(p)}
                                                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700/60 transition-transform active:scale-95"
                                                                    title="Adjust Stock / Audit Logs"
                                                                >
                                                                    <PackagePlus size={14} />
                                                                </button>

                                                                {/* Edit Product */}
                                                                <button
                                                                    onClick={() => setEditingProduct(p)}
                                                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg border border-slate-700/60 transition-transform active:scale-95"
                                                                    title="Edit Product"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>

                                                                {/* Delete (Admin only) */}
                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => setDeletingProduct(p)}
                                                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg border border-slate-700/60 transition-transform active:scale-95"
                                                                        title="Delete Product"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-500 font-medium px-2 py-0.5 rounded bg-slate-800/60">
                                                                Read-Only
                                                            </span>
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

            {/* Create Product Modal */}
            {isAdmin && (
                <CreateProductModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={handleCreateSave}
                    isLoading={createProductMutation.isPending}
                />
            )}

            {/* Edit Product Modal */}
            {isAdmin && (
                <EditProductModal
                    product={editingProduct}
                    isOpen={!!editingProduct}
                    onClose={() => setEditingProduct(null)}
                />
            )}

            {/* Stock Adjustment Modal */}
            <StockAdjustmentModal
                product={adjustingStockProduct}
                isOpen={!!adjustingStockProduct}
                onClose={() => setAdjustingStockProduct(null)}
            />

            {/* Delete Confirmation Modal */}
            {deletingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
                    <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
                            <Trash2 size={24} />
                        </div>

                        <div className="text-center space-y-1">
                            <h3 className="font-bold text-slate-100 text-base">Delete Product?</h3>
                            <p className="text-xs text-slate-400">
                                Are you sure you want to delete <span className="text-slate-200 font-bold">{deletingProduct.brand} {deletingProduct.modelNumber}</span>?
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">SN: {deletingProduct.serialNumber}</p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeletingProduct(null)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={deleteProductMutation.isPending}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                            >
                                {deleteProductMutation.isPending ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} /> Confirm Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

