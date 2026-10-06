import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    X, Wrench, User, Building, Phone, Mail, Hash,
    AlertCircle, Calendar, DollarSign, Loader2, Tag
} from 'lucide-react';
import { useCreateRepair, type CreateRepairPayload, type RepairPriority } from '../api/repairsApi';

interface CreateJobCardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const jobCardSchema = z.object({
    customerName: z.string().min(2, 'Customer name is required'),
    companyName: z.string().optional(),
    customerPhone: z.string().min(7, 'Valid contact number is required'),
    customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    customerGstin: z.string().optional(),
    deviceType: z.string().min(1, 'Device type is required'),
    brand: z.string().min(1, 'Brand is required'),
    modelNumber: z.string().min(2, 'Model number is required'),
    serialNumber: z.string().min(2, 'Serial number is required'),
    physicalCondition: z.string().optional(),
    reportedFault: z.string().min(3, 'Reported fault/symptoms are required'),
    priority: z.enum(['NORMAL', 'HIGH', 'URGENT']),
    estimatedCost: z.number().min(0).optional(),
    estimatedDeliveryDate: z.string().optional(),
});

type JobCardFormData = z.infer<typeof jobCardSchema>;

const DEVICE_TYPES = [
    'AC Drive',
    'DC Drive',
    'Loop Scanner',
    'Stack Controller',
    'Servo Drive',
    'PLC Module',
    'Soft Starter',
    'Power Supply',
    'HMI / Touch Panel',
    'Motor / Encoder',
    'Other Equipment',
];

const BRANDS = [
    'Control Techniques',
    'Parker',
    'Emotron',
    'Siemens',
    'ABB',
    'Schneider',
    'Danfoss',
    'Delta',
    'Fuji',
    'Eurotherm',
    'Mitsubishi',
    'Yaskawa',
    'Inovance',
    'Generic',
];

export const CreateJobCardModal: React.FC<CreateJobCardModalProps> = ({ isOpen, onClose }) => {
    const createRepairMutation = useCreateRepair();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<JobCardFormData>({
        resolver: zodResolver(jobCardSchema),
        defaultValues: {
            deviceType: 'AC Drive',
            brand: 'Schneider',
            priority: 'NORMAL',
            estimatedCost: 0,
        },
    });

    if (!isOpen) return null;

    const onSubmit = (data: JobCardFormData) => {
        const payload: CreateRepairPayload = {
            ...data,
            priority: data.priority as RepairPriority,
            customerEmail: data.customerEmail || undefined,
            customerGstin: data.customerGstin || undefined,
            companyName: data.companyName || undefined,
            physicalCondition: data.physicalCondition || undefined,
            estimatedCost: data.estimatedCost || 0,
            estimatedDeliveryDate: data.estimatedDeliveryDate || undefined,
        };

        createRepairMutation.mutate(payload, {
            onSuccess: () => {
                reset();
                onClose();
            },
            onError: (err: any) => {
                alert(err.response?.data?.error || 'Failed to create job-card');
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 sticky top-0 z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-100">
                                Inward Equipment Intake / New Job-Card
                            </h2>
                            <p className="text-xs text-slate-400">
                                Log customer drive/controller drop-off for repair & diagnosis
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Section 1: Client & Company Information */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <User size={14} /> 1. Client & Company Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-800/40 border border-slate-800 p-3.5 rounded-xl">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Customer / Contact Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ramesh Kumar"
                                    {...register('customerName')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                {errors.customerName && (
                                    <p className="text-[11px] text-red-400 mt-1">{errors.customerName.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Company / Factory Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Tata Steel / Vardhman Mills"
                                    {...register('companyName')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Phone Number (WhatsApp) <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="tel"
                                    placeholder="e.g. +91 9876543210"
                                    {...register('customerPhone')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                {errors.customerPhone && (
                                    <p className="text-[11px] text-red-400 mt-1">{errors.customerPhone.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    GSTIN Number (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 03AAAAA0000A1Z5"
                                    {...register('customerGstin')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Equipment & Fault Specifications */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag size={14} /> 2. Equipment & Inward Fault Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-800/40 border border-slate-800 p-3.5 rounded-xl">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Device Type <span className="text-red-400">*</span>
                                </label>
                                <select
                                    {...register('deviceType')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                    {DEVICE_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Brand / Manufacturer <span className="text-red-400">*</span>
                                </label>
                                <select
                                    {...register('brand')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                    {BRANDS.map((brand) => (
                                        <option key={brand} value={brand}>
                                            {brand}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Model Number <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. ATV320U22N4B / ACS880"
                                    {...register('modelNumber')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                {errors.modelNumber && (
                                    <p className="text-[11px] text-red-400 mt-1">{errors.modelNumber.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Serial Number <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. SN-88219034"
                                    {...register('serialNumber')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                {errors.serialNumber && (
                                    <p className="text-[11px] text-red-400 mt-1">{errors.serialNumber.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Priority Level
                                </label>
                                <select
                                    {...register('priority')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                >
                                    <option value="NORMAL">Normal (Standard SLA)</option>
                                    <option value="HIGH">High Priority</option>
                                    <option value="URGENT">Urgent (Plant Breakdown)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Target Delivery Date
                                </label>
                                <input
                                    type="date"
                                    {...register('estimatedDeliveryDate')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Reported Fault / Symptoms <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Overcurrent trip on motor startup, IGBT blown, power LED blinking, keypad dark"
                                    {...register('reportedFault')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                {errors.reportedFault && (
                                    <p className="text-[11px] text-red-400 mt-1">{errors.reportedFault.message}</p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Physical Condition & Accessories Included
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Top plastic cover scratched, terminal connector included, mounting bracket missing"
                                    {...register('physicalCondition')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Initial Quotation Estimate */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <DollarSign size={14} /> 3. Initial Estimation (Optional)
                        </h3>
                        <div className="bg-slate-800/40 border border-slate-800 p-3.5 rounded-xl">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Tentative Estimated Cost (₹)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    placeholder="e.g. 5000"
                                    {...register('estimatedCost', { valueAsNumber: true })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Approximate quote provided to client during inward drop-off.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createRepairMutation.isPending}
                            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95 transition-transform disabled:opacity-50"
                        >
                            {createRepairMutation.isPending ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                <Wrench size={16} />
                            )}
                            Generate Job-Card & Inward Ticket
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

