import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';

// =============================================
// TYPES
// =============================================

export type PanelType =
    | 'PLC_PANEL'
    | 'MCC_PANEL'
    | 'APFC_PANEL'
    | 'HMI_PANEL'
    | 'VFD_PANEL'
    | 'POWER_DISTRIBUTION_PANEL'
    | 'CUSTOM_PANEL';

export type PanelProjectStatus =
    | 'ORDER_BOOKED'
    | 'MATERIAL_ISSUED'
    | 'WIRING_ASSEMBLY'
    | 'TESTING_QA'
    | 'READY_FOR_DISPATCH'
    | 'DELIVERED'
    | 'ON_HOLD'
    | 'CANCELLED';

export type PanelBomSource =
    | 'STORE_INVENTORY'
    | 'PURCHASE_REQUIRED'
    | 'ALREADY_PURCHASED';

export interface PanelBomItem {
    id: number;
    panelProjectId: number;
    productId: number | null;
    componentName: string;
    componentCode: string | null;
    source: PanelBomSource;
    quantity: number;
    unitCost: string;
    totalCost: string;
    notes: string | null;
    createdAt: string;
}

export interface PanelAuditLog {
    id: number;
    panelProjectId: number;
    action: string;
    description: string;
    performedBy: string;
    createdAt: string;
}

export interface PanelProject {
    id: number;
    projectNumber: string;
    clientName: string;
    companyName: string | null;
    clientPhone: string;
    clientEmail: string | null;
    clientGstin: string | null;
    siteAddress: string | null;
    panelType: PanelType;
    panelDescription: string;
    specifications: Record<string, any>;
    status: PanelProjectStatus;
    assignedEngineer: string | null;
    priority: 'NORMAL' | 'HIGH' | 'URGENT';
    notes: string | null;
    sellingPrice: string;
    bomCostTotal: string;
    laborCost: string;
    otherCosts: string;
    taxRate: string;
    taxAmount: string;
    grandTotal: string;
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    advanceReceived: string;
    deliveryChallanNumber: string | null;
    invoiceNumber: string | null;
    orderDate: string;
    targetDeliveryDate: string | null;
    completedDate: string | null;
    deliveredDate: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PanelProjectWithBom extends PanelProject {
    bomItems: PanelBomItem[];
    auditLogs: PanelAuditLog[];
}

export interface CreatePanelPayload {
    clientName: string;
    companyName?: string;
    clientPhone: string;
    clientEmail?: string;
    clientGstin?: string;
    siteAddress?: string;
    panelType: PanelType;
    panelDescription: string;
    specifications?: Record<string, any>;
    assignedEngineer?: string;
    priority?: 'NORMAL' | 'HIGH' | 'URGENT';
    notes?: string;
    sellingPrice?: number;
    laborCost?: number;
    otherCosts?: number;
    taxRate?: number;
    advanceReceived?: number;
    targetDeliveryDate?: string;
}

export interface AddBomItemPayload {
    productId?: number | null;
    componentName: string;
    componentCode?: string;
    source: PanelBomSource;
    quantity: number;
    unitCost: number;
    notes?: string;
}

// =============================================
// FETCH FUNCTIONS
// =============================================

export const fetchPanelProjects = async (): Promise<PanelProject[]> => {
    const { data } = await axiosClient.get('panels');
    return data;
};

export const fetchPanelById = async (id: number): Promise<PanelProjectWithBom> => {
    const { data } = await axiosClient.get(`panels/${id}`);
    return data;
};

// =============================================
// TANSTACK QUERY HOOKS
// =============================================

export const useGetPanelProjects = () =>
    useQuery({ queryKey: ['panels'], queryFn: fetchPanelProjects });

export const useGetPanelById = (id: number | null) =>
    useQuery({
        queryKey: ['panels', id],
        queryFn: () => fetchPanelById(id!),
        enabled: id !== null,
    });

// Create panel project
export const useCreatePanelProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreatePanelPayload) =>
            axiosClient.post('panels', payload).then((r) => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['panels'] });
        },
    });
};

// Update panel project (status, billing, etc.)
export const useUpdatePanelProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }: Partial<PanelProject> & { id: number }) =>
            axiosClient.put(`panels/${id}`, payload).then((r) => r.data),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['panels'] });
            queryClient.invalidateQueries({ queryKey: ['panels', vars.id] });
        },
    });
};

// Add BOM item
export const useAddBomItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ panelId, ...payload }: AddBomItemPayload & { panelId: number }) =>
            axiosClient.post(`panels/${panelId}/bom`, payload).then((r) => r.data),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['panels', vars.panelId] });
            queryClient.invalidateQueries({ queryKey: ['panels'] });
            queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock changed
            queryClient.invalidateQueries({ queryKey: ['low-stock-products'] });
        },
    });
};

// Remove BOM item
export const useRemoveBomItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ panelId, itemId }: { panelId: number; itemId: number }) =>
            axiosClient.delete(`panels/${panelId}/bom/${itemId}`).then((r) => r.data),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['panels', vars.panelId] });
            queryClient.invalidateQueries({ queryKey: ['panels'] });
            queryClient.invalidateQueries({ queryKey: ['products'] }); // Stock restored
            queryClient.invalidateQueries({ queryKey: ['low-stock-products'] });
        },
    });
};

// Delete panel project
export const useDeletePanelProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            axiosClient.delete(`panels/${id}`).then((r) => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['panels'] });
        },
    });
};
