import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Minus, Check, AlertCircle } from 'lucide-react';

// Zod Schema matching your Backend requirements
const productSchema = z.object({
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
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    taxRate: z.number(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface CreateProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ProductFormData) => void;
    isLoading?: boolean;
}

// Preset option choices for fast entry
const BRANDS = ['Schneider', 'ABB', 'Siemens', 'Danfoss', 'Delta', 'Fuji', 'Generic'];
const TAX_RATES = [0, 5, 12, 18, 28];
const PRODUCT_TYPES = [
    { label: 'AC Drive', value: 'ac_drive' },
    { label: 'DC Drive', value: 'dc_drive' },
    { label: 'Servo', value: 'servo_drive' },
    { label: 'Motor', value: 'motor' },
    { label: 'Switch Gear', value: 'switch_gear' },
    { label: 'DBR', value: 'dbr' },
];

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
}) => {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            serialNumber: '',
            brand: 'Schneider',
            productType: 'ac_drive',
            modelNumber: '',
            unitPrice: 0,
            stock: 1,
            taxRate: 18,
        },
    });

    const currentBrand = watch('brand');
    const currentProductType = watch('productType');
    const currentTaxRate = watch('taxRate');
    const currentStock = watch('stock');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">

                {/* Modal Header */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800">
                    <div>
                        <h2 className="text-base font-bold text-slate-100">Quick Add Product</h2>
                        <p className="text-xs text-slate-400">Fill details or tap presets below</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-full"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4 overflow-y-auto flex-1">

                    {/* Product Type (Quick Select Chips) */}
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

                    {/* Brand Quick Chips */}
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
                        {errors.brand && <p className="text-red-400 text-xs mt-1">{errors.brand.message}</p>}
                    </div>

                    {/* Serial & Model Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">Serial Number *</label>
                            <input
                                {...register('serialNumber')}
                                placeholder="SN-998231"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                                placeholder="ATV320HU22N4B"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            {errors.modelNumber && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} /> {errors.modelNumber.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Price & Touch Stock Controls */}
                    <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">Unit Price (₹)</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                {...register('unitPrice', { valueAsNumber: true })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Numeric Touch Controls (+ / - Stock) */}
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">Stock Quantity</label>
                            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
                                <button
                                    type="button"
                                    onClick={() => setValue('stock', Math.max(0, currentStock - 1))}
                                    className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 active:scale-90 transition-transform"
                                >
                                    <Minus size={16} />
                                </button>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    {...register('stock', { valueAsNumber: true })}
                                    className="w-full bg-transparent text-center font-bold text-sm text-slate-100 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setValue('stock', currentStock + 1)}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white active:scale-90 transition-transform"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* GST Tax Rate Select */}
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">GST Rate (%)</label>
                        <div className="flex gap-2">
                            {TAX_RATES.map((rate) => (
                                <button
                                    type="button"
                                    key={rate}
                                    onClick={() => setValue('taxRate', rate)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${currentTaxRate === rate
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-500'
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
                        form="product-form"
                        disabled={isLoading}
                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 active:scale-95"
                    >
                        <Check size={16} /> {isLoading ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </div>
        </div>
    );
};