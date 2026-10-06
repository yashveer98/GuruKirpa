import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { type Product, useUpdateProduct } from '../api/productsApi';

const editProductSchema = z.object({
    serialNumber: z.string().min(1, 'Serial number is required'),
    brand: z.string().min(1, 'Brand is required'),
    productType: z.enum([
        'ac_drive',
        'dc_drive',
        'servo_drive',
        'motor',
        'switch_gear',
        'panel_accessory',
        'dbr',
        'dbu',
        'line_choke',
        'capacitor',
        'reactor',
        'ct',
    ]),
    modelNumber: z.string().min(1, 'Model number is required'),
    unitPrice: z.number().min(0, 'Price must be positive'),
    costPrice: z.number().min(0, 'Cost price must be positive').optional(),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    taxRate: z.number().min(0, 'Tax rate must be positive'),
    sku: z.string().optional(),
});

type EditProductFormData = z.infer<typeof editProductSchema>;

interface EditProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
}

const BRANDS = ['Schneider', 'ABB', 'Siemens', 'Danfoss', 'Delta', 'Fuji', 'Generic'];
const TAX_RATES = [0, 5, 12, 18, 28];
const PRODUCT_TYPES = [
    { label: 'AC Drive', value: 'ac_drive' },
    { label: 'DC Drive', value: 'dc_drive' },
    { label: 'Servo', value: 'servo_drive' },
    { label: 'Motor', value: 'motor' },
    { label: 'Switch Gear', value: 'switch_gear' },
    { label: 'DBR', value: 'dbr' },
    { label: 'Capacitor', value: 'capacitor' },
    { label: 'Line Choke', value: 'line_choke' },
];

export const EditProductModal: React.FC<EditProductModalProps> = ({
    product,
    isOpen,
    onClose,
}) => {
    const updateProductMutation = useUpdateProduct();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<EditProductFormData>({
        resolver: zodResolver(editProductSchema),
    });

    const currentBrand = watch('brand');
    const currentProductType = watch('productType');
    const currentTaxRate = watch('taxRate');

    useEffect(() => {
        if (product) {
            reset({
                serialNumber: product.serialNumber || '',
                brand: product.brand || 'Schneider',
                productType: (product.productType as any) || 'ac_drive',
                modelNumber: product.modelNumber || '',
                unitPrice: Number(product.unitPrice) || 0,
                costPrice: Number(product.costPrice) || 0,
                stock: Number(product.stock) || 0,
                taxRate: Number(product.taxRate) || 18,
                sku: product.sku || '',
            });
        }
    }, [product, reset]);

    if (!isOpen || !product) return null;

    const onSubmit = (data: EditProductFormData) => {
        updateProductMutation.mutate(
            {
                id: product.id!,
                ...data,
            },
            {
                onSuccess: () => {
                    onClose();
                },
                onError: (err: any) => {
                    alert(err.response?.data?.error || 'Failed to update product');
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 text-slate-100">

                {/* Modal Header */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800">
                    <div>
                        <h2 className="text-base font-bold text-slate-100">Edit Product</h2>
                        <p className="text-xs text-slate-400">Update specifications, pricing, and details</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <form id="edit-product-form" onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 overflow-y-auto flex-1">

                    {/* Product Type Chips */}
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">Product Type</label>
                        <div className="flex flex-wrap gap-1.5">
                            {PRODUCT_TYPES.map((type) => (
                                <button
                                    type="button"
                                    key={type.value}
                                    onClick={() => setValue('productType', type.value as any)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${currentProductType === type.value
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 font-semibold'
                                        : 'bg-slate-800 text-slate-400 border-slate-700/60'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Brand Chips */}
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">Brand</label>
                        <div className="flex flex-wrap gap-1.5">
                            {BRANDS.map((brand) => (
                                <button
                                    type="button"
                                    key={brand}
                                    onClick={() => setValue('brand', brand)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${currentBrand === brand
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-semibold'
                                        : 'bg-slate-800 text-slate-400 border-slate-700/60'
                                        }`}
                                >
                                    {brand}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Serial & Model Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">Serial Number *</label>
                            <input
                                {...register('serialNumber')}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {errors.serialNumber && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} /> {errors.serialNumber.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">Model Number *</label>
                            <input
                                {...register('modelNumber')}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {errors.modelNumber && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} /> {errors.modelNumber.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Unit Price & Cost Price */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">Selling Price (₹) *</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                {...register('unitPrice', { valueAsNumber: true })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {errors.unitPrice && (
                                <p className="text-red-400 text-xs mt-1">{errors.unitPrice.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">Cost Price (₹)</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                {...register('costPrice', { valueAsNumber: true })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Stock & SKU */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">Stock Units</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                {...register('stock', { valueAsNumber: true })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">SKU / Custom Code</label>
                            <input
                                {...register('sku')}
                                placeholder="e.g. GK-INV-001"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* GST Tax Rate */}
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">GST Rate (%)</label>
                        <div className="flex gap-2">
                            {TAX_RATES.map((rate) => (
                                <button
                                    type="button"
                                    key={rate}
                                    onClick={() => setValue('taxRate', rate)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${currentTaxRate === rate
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                                        : 'bg-slate-800 text-slate-400 border-slate-700/60'
                                        }`}
                                >
                                    {rate}%
                                </button>
                            ))}
                        </div>
                    </div>
                </form>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-800 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-product-form"
                        disabled={updateProductMutation.isPending}
                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 active:scale-95"
                    >
                        {updateProductMutation.isPending ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Saving Changes...
                            </>
                        ) : (
                            <>
                                <Check size={16} /> Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

