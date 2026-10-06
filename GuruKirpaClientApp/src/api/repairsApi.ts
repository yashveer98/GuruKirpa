import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';

export type RepairStatus =
    | 'RECEIVED'
    | 'IN_DIAGNOSIS'
    | 'ESTIMATION_SENT'
    | 'IN_REPAIR'
    | 'WAITING_FOR_PARTS'
    | 'TESTING'
    | 'READY_FOR_PICKUP'
    | 'DELIVERED'
    | 'UNREPAIRABLE_RETURN'
    | 'SCRAP';

export type RepairPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export interface RepairPart {
    id: number;
    repairId: number;
    productId?: number | null;
    partName: string;
    partNumber?: string | null;
    source: 'STORE_INVENTORY' | 'NEEDS_PROCUREMENT' | 'EXTERNAL_PURCHASE';
    quantity: number;
    unitCost: string | number;
    totalCost: string | number;
    createdAt?: string;
}

export interface RepairAuditLog {
    id: number;
    repairId: number;
    action: string;
    description: string;
    performedBy?: string;
    createdAt: string;
}

export interface Repair {
    id: number;
    jobCardNumber: string;
    customerName: string;
    companyName?: string | null;
    customerPhone: string;
    customerEmail?: string | null;
    customerGstin?: string | null;
    deviceType: string;
    brand: string;
    modelNumber: string;
    serialNumber: string;
    physicalCondition?: string | null;
    reportedFault: string;
    priority: RepairPriority;
    assignedTechnician?: string | null;
    diagnosisObservations?: string | null;
    isRepairable: string;
    repairNotes?: string | null;
    status: RepairStatus;
    estimatedCost: string | number;
    serviceCharge: string | number;
    partsCost: string | number;
    taxRate: string | number;
    taxAmount: string | number;
    grandTotal: string | number;
    paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
    warrantyMonths: number;
    deliveryChallanNumber?: string | null;
    invoiceNumber?: string | null;
    receivedDate?: string;
    estimatedDeliveryDate?: string | null;
    completedDate?: string | null;
    deliveredDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
    parts?: RepairPart[];
    auditLogs?: RepairAuditLog[];
}

export interface CreateRepairPayload {
    customerName: string;
    companyName?: string;
    customerPhone: string;
    customerEmail?: string;
    customerGstin?: string;
    deviceType: string;
    brand: string;
    modelNumber: string;
    serialNumber: string;
    physicalCondition?: string;
    reportedFault: string;
    priority?: RepairPriority;
    estimatedCost?: number | string;
    estimatedDeliveryDate?: string;
}

export interface UpdateRepairPayload extends Partial<Omit<Repair, 'id' | 'jobCardNumber' | 'parts' | 'auditLogs'>> {
    id: number;
}

export interface AddPartPayload {
    repairId: number;
    productId?: number | null;
    partName: string;
    partNumber?: string;
    source?: 'STORE_INVENTORY' | 'NEEDS_PROCUREMENT' | 'EXTERNAL_PURCHASE';
    quantity: number;
    unitCost: number | string;
}

// 1. Fetch Repairs List
export const fetchRepairs = async (params?: {
    search?: string;
    status?: string;
    brand?: string;
    priority?: string;
    page?: number;
    limit?: number;
}): Promise<Repair[]> => {
    const response = await axiosClient.get('/repairs', { params: { limit: 100, ...params } });
    if (Array.isArray(response.data)) {
        return response.data;
    }
    return response.data?.data || response.data?.repairs || [];
};

// 2. Fetch Single Repair Job with Parts & Audit Logs
export const fetchRepairDetails = async (repairId: number): Promise<Repair> => {
    const response = await axiosClient.get(`/repairs/${repairId}`);
    return response.data;
};

// 3. Fetch Audit Logs for a Repair
export const fetchRepairAuditLogs = async (repairId: number): Promise<RepairAuditLog[]> => {
    const response = await axiosClient.get(`/repairs/${repairId}/audit-logs`);
    return response.data;
};

// 4. Create Job Card
export const createRepair = async (payload: CreateRepairPayload): Promise<Repair> => {
    const response = await axiosClient.post('/repairs', payload);
    return response.data?.repair || response.data;
};

// 5. Update Repair Job
export const updateRepair = async ({ id, ...payload }: UpdateRepairPayload): Promise<Repair> => {
    const response = await axiosClient.put(`/repairs/${id}`, payload);
    return response.data?.repair || response.data;
};

// 6. Add Part Replaced
export const addRepairPart = async ({ repairId, ...partData }: AddPartPayload): Promise<RepairPart> => {
    const response = await axiosClient.post(`/repairs/${repairId}/parts`, partData);
    return response.data?.part || response.data;
};

// 7. Delete Part Replaced
export const deleteRepairPart = async ({
    repairId,
    partId,
}: {
    repairId: number;
    partId: number;
}): Promise<void> => {
    await axiosClient.delete(`/repairs/${repairId}/parts/${partId}`);
};

// 8. Delete Repair Job
export const deleteRepair = async (repairId: number): Promise<void> => {
    await axiosClient.delete(`/repairs/${repairId}`);
};

// --- TANSTACK QUERY HOOKS ---

export const useGetRepairs = (params?: {
    search?: string;
    status?: string;
    brand?: string;
    priority?: string;
}) => {
    return useQuery({
        queryKey: ['repairs', params],
        queryFn: () => fetchRepairs(params),
    });
};

export const useGetRepairDetails = (repairId?: number) => {
    return useQuery({
        queryKey: ['repair-details', repairId],
        queryFn: () => fetchRepairDetails(repairId!),
        enabled: !!repairId,
    });
};

export const useGetRepairAuditLogs = (repairId?: number) => {
    return useQuery({
        queryKey: ['repair-audit-logs', repairId],
        queryFn: () => fetchRepairAuditLogs(repairId!),
        enabled: !!repairId,
    });
};

export const useCreateRepair = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createRepair,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
        },
    });
};

export const useUpdateRepair = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateRepair,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
            queryClient.invalidateQueries({ queryKey: ['repair-details', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['repair-audit-logs', variables.id] });
        },
    });
};

export const useAddRepairPart = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addRepairPart,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
            queryClient.invalidateQueries({ queryKey: ['repair-details', variables.repairId] });
            queryClient.invalidateQueries({ queryKey: ['repair-audit-logs', variables.repairId] });
            queryClient.invalidateQueries({ queryKey: ['products'] }); // 👈 Auto-refresh store inventory
        },
    });
};

export const useDeleteRepairPart = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteRepairPart,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
            queryClient.invalidateQueries({ queryKey: ['repair-details', variables.repairId] });
            queryClient.invalidateQueries({ queryKey: ['repair-audit-logs', variables.repairId] });
            queryClient.invalidateQueries({ queryKey: ['products'] }); // 👈 Auto-restore store inventory
        },
    });
};

export const useDeleteRepair = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteRepair,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['repairs'] });
        },
    });
};

