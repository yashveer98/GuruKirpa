import React, { useState, useMemo } from 'react';
import {
    Search, Plus, Minus, Trash2, ShoppingCart,
    FileText, CheckCircle2, User, Phone, CreditCard, ArrowLeft, Loader2
} from 'lucide-react';
import { type Product, useGetProducts } from '../api/productsApi.ts';
import { useCreateOrder, type CreateOrderPayload } from '../api/ordersApi.ts';

interface CartItem {
    product: Product;
    quantity: number;
}

interface QuickOrderScreenProps {
    onBack?: () => void;
}

export const QuickOrderScreen: React.FC<QuickOrderScreenProps> = ({ onBack }) => {
    // Search & Cart state
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);

    // Customer & Payment state
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerGstin, setCustomerGstin] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'credit'>('upi');
    const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string; pdfUrl?: string } | null>(null);

    // Queries & Mutations
    const { data: rawProducts, isLoading: isProductsLoading } = useGetProducts();
    const createOrderMutation = useCreateOrder();

    const products = Array.isArray(rawProducts) ? rawProducts : [];

    // Filter products by search
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(
            (p) =>
                p.modelNumber.toLowerCase().includes(q) ||
                p.brand.toLowerCase().includes(q) ||
                p.serialNumber.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    // Cart operations
    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) return prev; // Don't exceed stock
                return prev.map((item) =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product.id === productId) {
                        const newQty = item.quantity + delta;
                        if (newQty <= 0) return null;
                        if (newQty > item.product.stock) return item;
                        return { ...item, quantity: newQty };
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[]
        );
    };

    const removeFromCart = (productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    // Tax and Total calculations
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;

        cart.forEach(({ product, quantity }) => {
            const price = Number(product.unitPrice) || 0;
            const tax = Number(product.taxRate) || 0;
            const itemSubtotal = price * quantity;
            const itemTax = (itemSubtotal * tax) / 100;
            subtotal += itemSubtotal;
            totalTax += itemTax;
        });

        return {
            subtotal,
            totalTax,
            grandTotal: subtotal + totalTax,
        };
    }, [cart]);

    // Handle Submit Order
    const handleCheckout = () => {
        if (cart.length === 0) return alert('Please add at least one product to the order.');
        if (!customerName.trim()) return alert('Please enter Customer Name.');

        const payload: CreateOrderPayload = {
            customerName,
            customerPhone: customerPhone.trim() || undefined,
            customerGstin: customerGstin.trim() || undefined,
            paymentMethod,
            items: cart.map(({ product, quantity }) => ({
                productId: product.id!,
                quantity,
                unitPrice: Number(product.unitPrice),
                taxRate: Number(product.taxRate),
            })),
        };

        createOrderMutation.mutate(payload, {
            onSuccess: (data) => {
                setOrderSuccess({
                    orderNumber: data.invoiceNumber,
                    pdfUrl: data.pdfUrl,
                });
                setCart([]);
            },
            onError: (err: any) => {
                alert(err.response?.data?.error || 'Failed to process order. Check server connection.');
            },
        });
    };

    // Render Order Confirmation Modal
    if (orderSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                    <CheckCircle2 size={36} />
                </div>
                <h2 className="text-xl font-bold text-slate-100">Order Placed Successfully!</h2>
                <p className="text-xs text-slate-400 mt-1">Invoice Number: <span className="font-mono text-emerald-400 font-bold">{orderSuccess.orderNumber}</span></p>

                <div className="w-full max-w-xs space-y-3 mt-6">
                    <a
                        href={orderSuccess.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-transform active:scale-95"
                    >
                        <FileText size={18} /> Download / View PDF Invoice
                    </a>

                    <button
                        onClick={() => setOrderSuccess(null)}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition-colors"
                    >
                        Create New Order
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-slate-100 sm:max-w-none">

            {/* Top Header */}
            <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-3 sticky top-0 z-20">
                {onBack && (
                    <button onClick={onBack} className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg">
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div>
                    <h1 className="font-bold text-base text-slate-100">Quick POS Order</h1>
                    <p className="text-[11px] text-slate-400">Select items & checkout</p>
                </div>
            </header>

            {/* Main Split Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Customer Details Box */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
                    <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User size={14} /> Customer Information
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                            type="text"
                            placeholder="Customer Name *"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="bg-slate-800 border border-slate-700/70 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="relative">
                            <Phone size={14} className="absolute left-3 top-2.5 text-slate-500" />
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700/70 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="GSTIN (Optional)"
                            value={customerGstin}
                            onChange={(e) => setCustomerGstin(e.target.value)}
                            className="bg-slate-800 border border-slate-700/70 rounded-lg px-3 py-2 text-xs font-mono uppercase text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:col-span-2"
                        />
                    </div>
                </section>

                {/* Product Catalog Search */}
                <section className="space-y-2">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search model, brand, or serial no..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Product Items List (Quick Tap to Add) */}
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {isProductsLoading ? (
                            <div className="text-center py-4 text-xs text-slate-500">Loading products...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-500">No products found</div>
                        ) : (
                            filteredProducts.map((p) => {
                                const inCart = cart.find((item) => item.product.id === p.id);
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => addToCart(p)}
                                        className={`p-2.5 rounded-xl border flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${inCart
                                            ? 'bg-emerald-500/10 border-emerald-500/40'
                                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                            }`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                                    {p.brand}
                                                </span>
                                                <span className="text-xs font-medium text-slate-200">{p.modelNumber}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Stock: <span className="text-slate-200">{p.stock}</span> | SN: {p.serialNumber}
                                            </p>
                                        </div>

                                        <div className="text-right flex items-center gap-3">
                                            <div>
                                                <p className="text-xs font-bold text-emerald-400">₹{Number(p.unitPrice).toLocaleString('en-IN')}</p>
                                                <p className="text-[9px] text-slate-500">+{p.taxRate}% GST</p>
                                            </div>
                                            <button className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg font-bold">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* Selected Cart Items */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingCart size={14} /> Order Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
                        </h2>
                        {cart.length > 0 && (
                            <button
                                onClick={() => setCart([])}
                                className="text-[10px] text-red-400 hover:underline flex items-center gap-1"
                            >
                                Clear Cart
                            </button>
                        )}
                    </div>

                    {cart.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500">
                            Tap items above to add them to this order
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {cart.map(({ product, quantity }) => (
                                <div
                                    key={product.id}
                                    className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-2.5 flex justify-between items-center"
                                >
                                    <div className="flex-1 pr-2">
                                        <p className="text-xs font-semibold text-slate-100">{product.brand} {product.modelNumber}</p>
                                        <p className="text-[10px] text-slate-400">
                                            ₹{Number(product.unitPrice)} × {quantity} = <span className="text-slate-200 font-semibold">₹{(Number(product.unitPrice) * quantity).toLocaleString('en-IN')}</span>
                                        </p>
                                    </div>

                                    {/* Quantity Touch Controls */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => updateQuantity(product.id!, -1)}
                                            className="p-1 bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span className="text-xs font-bold w-5 text-center text-slate-100">{quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(product.id!, 1)}
                                            className="p-1 bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
                                        >
                                            <Plus size={12} />
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(product.id!)}
                                            className="p-1 text-slate-500 hover:text-red-400 ml-1"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Payment Method Selector */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <label className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
                        <CreditCard size={14} /> Payment Method
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                        {(['upi', 'cash', 'card', 'credit'] as const).map((method) => (
                            <button
                                key={method}
                                type="button"
                                onClick={() => setPaymentMethod(method)}
                                className={`py-2 rounded-lg text-xs font-bold uppercase transition-all border ${paymentMethod === method
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                    : 'bg-slate-800 text-slate-400 border-slate-700/60'
                                    }`}
                            >
                                {method}
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* Fixed Bottom Checkout Footer */}
            <footer className="p-4 bg-slate-900 border-t border-slate-800 space-y-3 sticky bottom-0 z-20">
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>GST Tax</span>
                        <span>₹{totals.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base text-slate-100 pt-1 border-t border-slate-800">
                        <span>Grand Total</span>
                        <span className="text-emerald-400">₹{totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <button
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || createOrderMutation.isPending}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95"
                >
                    {createOrderMutation.isPending ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Processing Order...
                        </>
                    ) : (
                        <>
                            <FileText size={16} /> Complete Order & Generate Invoice
                        </>
                    )}
                </button>
            </footer>
        </div>
    );
};