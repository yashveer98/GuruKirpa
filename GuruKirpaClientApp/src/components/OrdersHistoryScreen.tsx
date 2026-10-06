import React, { useState, useMemo } from 'react';
import {
    Search, FileText, ArrowLeft, Download, Eye, CheckCircle2,
    Clock, AlertCircle, ShoppingBag, DollarSign, Calendar,
    User, Phone, Hash, X, Loader2, Check, RefreshCw
} from 'lucide-react';
import {
    useGetOrders,
    useGetOrderDetails,
    useUpdatePaymentStatus,
    type ServerOrder
} from '../api/ordersApi';
import { API_BASE_URL } from '../api/axiosClient';

interface OrdersHistoryScreenProps {
    onBack?: () => void;
    onNewOrder?: () => void;
}

export const OrdersHistoryScreen: React.FC<OrdersHistoryScreenProps> = ({
    onBack,
    onNewOrder,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL'>('ALL');
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

    // Queries & Mutations
    const { data: rawOrders, isLoading, isError, refetch, isFetching } = useGetOrders({
        search: searchQuery.trim() || undefined,
        paymentStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
    });
    const updatePaymentStatusMutation = useUpdatePaymentStatus();
    const { data: orderDetails, isLoading: isDetailsLoading } = useGetOrderDetails(selectedOrderId || undefined);

    const orders = Array.isArray(rawOrders) ? rawOrders : [];

    // Filter orders locally for instant feedback
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !q ||
                order.invoiceNumber.toLowerCase().includes(q) ||
                order.customerName.toLowerCase().includes(q) ||
                (order.customerGstin && order.customerGstin.toLowerCase().includes(q));

            const matchesStatus = statusFilter === 'ALL' || order.paymentStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [orders, searchQuery, statusFilter]);

    // Financial KPI Calculations
    const metrics = useMemo(() => {
        let totalRevenue = 0;
        let totalTax = 0;
        let paidRevenue = 0;
        let unpaidRevenue = 0;
        let unpaidCount = 0;

        orders.forEach((o) => {
            const grandTotal = Number(o.grandTotal) || 0;
            const tax = Number(o.taxAmount) || 0;
            totalRevenue += grandTotal;
            totalTax += tax;

            if (o.paymentStatus === 'PAID') {
                paidRevenue += grandTotal;
            } else {
                unpaidRevenue += grandTotal;
                unpaidCount++;
            }
        });

        return {
            totalOrders: orders.length,
            totalRevenue,
            totalTax,
            paidRevenue,
            unpaidRevenue,
            unpaidCount,
        };
    }, [orders]);

    const handleStatusChange = (orderId: number, newStatus: 'PAID' | 'UNPAID' | 'PARTIAL') => {
        updatePaymentStatusMutation.mutate({
            orderId,
            paymentStatus: newStatus,
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
                            <span>Sales Invoices & Order History</span>
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                {orders.length} Invoices
                            </span>
                        </h1>
                        <p className="text-xs text-slate-400">Track customer billing, payment status, and download PDF receipts</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl border border-slate-700/60 transition-colors"
                        title="Refresh Invoices"
                    >
                        <RefreshCw size={16} className={isFetching ? 'animate-spin text-emerald-400' : ''} />
                    </button>

                    {onNewOrder && (
                        <button
                            onClick={onNewOrder}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-transform active:scale-95"
                        >
                            <ShoppingBag size={16} /> New POS Order
                        </button>
                    )}
                </div>
            </header>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">

                {/* KPI Metrics Dashboard Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <DollarSign size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Total Sales Revenue</p>
                            <p className="text-xl font-bold text-emerald-400 mt-0.5">
                                ₹{metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <FileText size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Total Invoices</p>
                            <p className="text-xl font-bold text-slate-100 mt-0.5">{metrics.totalOrders}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
                            <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Collected / Paid</p>
                            <p className="text-xl font-bold text-teal-400 mt-0.5">
                                ₹{metrics.paidRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs">
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <AlertCircle size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Outstanding Credit</p>
                            <p className="text-xl font-bold text-amber-400 mt-0.5">
                                ₹{metrics.unpaidRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search & Status Filters */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">

                        {/* Search Input */}
                        <div className="relative w-full md:w-80">
                            <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search invoice #, customer, GSTIN..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Status Filter Chips */}
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 no-scrollbar">
                            {(['ALL', 'PAID', 'UNPAID', 'PARTIAL'] as const).map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${statusFilter === status
                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    {status === 'ALL' ? 'All Invoices' : status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Invoices Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="animate-spin mb-2 text-emerald-400" size={32} />
                            <p className="text-xs">Loading sales invoices...</p>
                        </div>
                    ) : isError ? (
                        <div className="p-8 text-center text-red-400 text-xs">
                            Failed to connect to backend server.
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 text-xs space-y-2">
                            <FileText size={32} className="mx-auto text-slate-600" />
                            <p>{orders.length === 0 ? 'No sales orders created yet.' : 'No invoices match your search.'}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                                        <th className="py-3.5 px-4">Invoice # & Date</th>
                                        <th className="py-3.5 px-4">Customer Details</th>
                                        <th className="py-3.5 px-4 text-right">Subtotal</th>
                                        <th className="py-3.5 px-4 text-right">Tax (GST)</th>
                                        <th className="py-3.5 px-4 text-right">Grand Total</th>
                                        <th className="py-3.5 px-4 text-center">Payment Status</th>
                                        <th className="py-3.5 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {filteredOrders.map((order) => {
                                        const isPaid = order.paymentStatus === 'PAID';
                                        const isPartial = order.paymentStatus === 'PARTIAL';
                                        const isUnpaid = order.paymentStatus === 'UNPAID' || !order.paymentStatus;
                                        const pdfUrl = `${API_BASE_URL}/orders/${order.id}/pdf`;

                                        return (
                                            <tr
                                                key={order.id}
                                                className="hover:bg-slate-800/40 transition-colors"
                                            >
                                                {/* Invoice # & Date */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-mono font-bold text-emerald-400 text-sm">
                                                        {order.invoiceNumber}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Clock size={11} />
                                                        {order.createdAt
                                                            ? new Date(order.createdAt).toLocaleString('en-IN', {
                                                                dateStyle: 'medium',
                                                                timeStyle: 'short',
                                                            })
                                                            : 'Recent'}
                                                    </div>
                                                </td>

                                                {/* Customer Details */}
                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                                                        <User size={13} className="text-slate-400" />
                                                        {order.customerName}
                                                    </div>
                                                    {order.customerGstin && (
                                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                            GSTIN: {order.customerGstin}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Subtotal */}
                                                <td className="py-3.5 px-4 text-right text-slate-300 font-medium">
                                                    ₹{Number(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>

                                                {/* Tax Amount */}
                                                <td className="py-3.5 px-4 text-right text-slate-400 text-xs">
                                                    ₹{Number(order.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>

                                                {/* Grand Total */}
                                                <td className="py-3.5 px-4 text-right">
                                                    <span className="font-bold text-sm text-emerald-400">
                                                        ₹{Number(order.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>

                                                {/* Payment Status (Interactive Toggle) */}
                                                <td className="py-3.5 px-4 text-center">
                                                    <select
                                                        value={order.paymentStatus || 'UNPAID'}
                                                        onChange={(e) =>
                                                            handleStatusChange(
                                                                order.id,
                                                                e.target.value as 'PAID' | 'UNPAID' | 'PARTIAL'
                                                            )
                                                        }
                                                        className={`text-xs font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${isPaid
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                                : isPartial
                                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                            }`}
                                                    >
                                                        <option value="PAID" className="bg-slate-900 text-emerald-400">
                                                            PAID
                                                        </option>
                                                        <option value="PARTIAL" className="bg-slate-900 text-amber-400">
                                                            PARTIAL
                                                        </option>
                                                        <option value="UNPAID" className="bg-slate-900 text-red-400">
                                                            UNPAID
                                                        </option>
                                                    </select>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* View Details */}
                                                        <button
                                                            onClick={() => setSelectedOrderId(order.id)}
                                                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 transition-transform active:scale-95"
                                                            title="View Order Items & Summary"
                                                        >
                                                            <Eye size={15} />
                                                        </button>

                                                        {/* PDF Download */}
                                                        <a
                                                            href={pdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 transition-transform active:scale-95 flex items-center justify-center"
                                                            title="Download PDF Invoice"
                                                        >
                                                            <Download size={15} />
                                                        </a>
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

            {/* Order Details & Items Modal */}
            {selectedOrderId && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-100">

                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-800 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                        {orderDetails?.invoiceNumber || `ORD-${selectedOrderId}`}
                                    </span>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${orderDetails?.paymentStatus === 'PAID'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                                            }`}
                                    >
                                        {orderDetails?.paymentStatus || 'UNPAID'}
                                    </span>
                                </div>
                                <h2 className="text-base font-bold text-slate-100 mt-1">
                                    Customer: {orderDetails?.customerName}
                                </h2>
                                {orderDetails?.customerGstin && (
                                    <p className="text-xs text-slate-400 font-mono">
                                        GSTIN: {orderDetails.customerGstin}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedOrderId(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-4 overflow-y-auto flex-1">
                            {isDetailsLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Loader2 className="animate-spin mb-2 text-emerald-400" size={28} />
                                    <p className="text-xs">Loading invoice items...</p>
                                </div>
                            ) : !orderDetails?.items || orderDetails.items.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 text-xs">
                                    No line items found for this order.
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                                        Ordered Items ({orderDetails.items.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {orderDetails.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                                            {item.product?.brand || 'Generic'}
                                                        </span>
                                                        <span className="font-bold text-slate-100 text-xs">
                                                            {item.product?.modelNumber}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                                        SN: {item.product?.serialNumber} | Qty: <span className="font-bold text-slate-200">{item.quantity}</span>
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <p className="font-bold text-xs text-slate-100">
                                                        ₹{Number(item.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        ₹{Number(item.unitPrice)} each (+{item.taxRate}% GST)
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Financial Summary Box */}
                            {orderDetails && (
                                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-1.5 text-xs">
                                    <div className="flex justify-between text-slate-400">
                                        <span>Subtotal</span>
                                        <span>₹{Number(orderDetails.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>Total GST Tax</span>
                                        <span>₹{Number(orderDetails.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold text-slate-100 pt-2 border-t border-slate-700">
                                        <span>Grand Total</span>
                                        <span className="text-emerald-400">
                                            ₹{Number(orderDetails.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-800 flex gap-3">
                            <a
                                href={`${API_BASE_URL}/orders/${selectedOrderId}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95 transition-transform"
                            >
                                <Download size={16} /> Download PDF Invoice
                            </a>
                            <button
                                type="button"
                                onClick={() => setSelectedOrderId(null)}
                                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

