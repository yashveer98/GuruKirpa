import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, ShoppingCart, Loader2, LogOut, Search,
  PackagePlus, AlertTriangle, Filter, Table, LayoutGrid, FileText, Wrench
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { AppLayout, type NavTab } from './components/AppLayout';
import { CreateProductModal } from './components/CreateProductModal';
import { StockAdjustmentModal } from './components/StockAdjustmentModal';
import { QuickOrderScreen } from './components/QuickOrderScreen';
import { ProductsTable } from './components/ProductsTable';
import { OrdersHistoryScreen } from './components/OrdersHistoryScreen';
import { LowStockAlertScreen } from './components/LowStockAlertScreen';
import { RepairManagementScreen } from './components/RepairManagementScreen';
import { PanelManagementScreen } from './components/PanelManagementScreen';
import { useGetProducts, useCreateProduct, type Product } from './api/productsApi';

export default function App() {
  const {
    isAuthenticated,
    user,
    isAdmin,
    canAccessPOS,
    canAccessPanels,
    canAccessRepairs,
    canAccessOrders,
    canAccessLowStock,
    logout
  } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (user?.role === 'LAB_TECHNICIAN') return 'repairs';
    if (user?.role === 'SALES_FINANCE') return 'panels';
    return 'table';
  });

  // Switch landing tab if role changes
  useEffect(() => {
    if (user?.role === 'LAB_TECHNICIAN') {
      setActiveTab('repairs');
    } else if (user?.role === 'SALES_FINANCE') {
      setActiveTab('panels');
    } else {
      setActiveTab('table');
    }
  }, [user?.role]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // TanStack Query Hooks
  const { data: rawProducts, isLoading: isFetchingProducts, isError } = useGetProducts();
  const createProductMutation = useCreateProduct();

  const products = Array.isArray(rawProducts) ? rawProducts : [];

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'ALL' || p.productType === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Categories list for chips
  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.productType).filter(Boolean)));
    return ['ALL', ...unique];
  }, [products]);

  // If not logged in, force Login Screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const handleSaveProduct = (data: any) => {
    createProductMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || 'Failed to create product');
      },
    });
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'pos':
        if (!canAccessPOS) return <ProductsTable onBack={() => setActiveTab('table')} />;
        return <QuickOrderScreen onBack={() => setActiveTab('table')} />;

      case 'orders':
        if (!canAccessOrders) return <ProductsTable onBack={() => setActiveTab('table')} />;
        return (
          <OrdersHistoryScreen
            onBack={() => setActiveTab('table')}
            onNewOrder={() => setActiveTab('pos')}
          />
        );

      case 'low-stock':
        if (!canAccessLowStock) return <ProductsTable onBack={() => setActiveTab('table')} />;
        return (
          <LowStockAlertScreen
            onBack={() => setActiveTab('table')}
            onOpenInventory={() => setActiveTab('table')}
          />
        );

      case 'panels':
        if (!canAccessPanels) return <ProductsTable onBack={() => setActiveTab('table')} />;
        return <PanelManagementScreen onBack={() => setActiveTab('table')} />;

      case 'repairs':
        if (!canAccessRepairs) return <ProductsTable onBack={() => setActiveTab('table')} />;
        return <RepairManagementScreen onBack={() => setActiveTab('table')} />;

      case 'table':
        return (
          <ProductsTable
            onBack={() => setActiveTab('inventory')}
            onOpenPos={canAccessPOS ? () => setActiveTab('pos') : undefined}
            onOpenOrders={canAccessOrders ? () => setActiveTab('orders') : undefined}
            onOpenLowStock={canAccessLowStock ? () => setActiveTab('low-stock') : undefined}
            onOpenRepairs={canAccessRepairs ? () => setActiveTab('repairs') : undefined}
          />
        );

      case 'inventory':
      default:
        return (
          <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
            {/* Search & Category Filter Bar */}
            <div className="p-4 space-y-3 bg-slate-900 border-b border-slate-800">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Mobile Inventory Feed</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      {products.length} Items
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400">Quick product browsing and stock adjustments</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('table')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700/60"
                  >
                    <Table size={14} /> Desktop Table
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2 rounded-xl text-xs flex items-center gap-1 shadow-lg shadow-emerald-500/10"
                      title="Add Product"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search model, brand, or serial..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Category Chips */}
              {categories.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all ${selectedCategory === cat
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                        }`}
                    >
                      {cat === 'ALL' ? 'All Items' : cat.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Cards Feed */}
            <div className="p-4 space-y-2.5 flex-1 overflow-y-auto">
              {isFetchingProducts ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="animate-spin mb-2 text-emerald-400" size={28} />
                  <p className="text-xs">Loading live inventory...</p>
                </div>
              ) : isError ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs text-center">
                  Failed to connect to backend server.
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  {products.length === 0 ? 'No products found in system.' : 'No products match your search.'}
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isLowStock = product.stock <= 5;

                  return (
                    <div
                      key={product.id || product.serialNumber}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex justify-between items-center shadow-xs transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/20 uppercase">
                            {product.productType ? product.productType.replace('_', ' ') : 'ITEM'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">SN: {product.serialNumber}</span>
                        </div>

                        <h3 className="font-semibold text-sm text-slate-100">
                          <span className="text-slate-400 font-normal">{product.brand}</span> {product.modelNumber}
                        </h3>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold flex items-center gap-1 ${isLowStock ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                          >
                            {isLowStock && <AlertTriangle size={12} className="text-amber-400" />}
                            Stock: {product.stock} units
                          </span>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <div>
                          <p className="font-bold text-sm text-slate-100">
                            ₹{Number(product.unitPrice).toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] text-slate-500">+{product.taxRate}% GST</span>
                        </div>

                        <button
                          onClick={() => setSelectedProductForStock(product)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/60 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 ml-auto"
                          title="Adjust Stock / View History"
                        >
                          <PackagePlus size={13} /> Adjust Stock
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Product Entry Modal (Admin Only) */}
            {isAdmin && (
              <CreateProductModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleSaveProduct}
                isLoading={createProductMutation.isPending}
              />
            )}

            {/* Stock Adjustment & Audit History Modal */}
            <StockAdjustmentModal
              product={selectedProductForStock}
              isOpen={!!selectedProductForStock}
              onClose={() => setSelectedProductForStock(null)}
            />
          </div>
        );
    }
  };

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActiveScreen()}
    </AppLayout>
  );
}