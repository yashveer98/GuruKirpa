import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';

export type StockAdjustmentType = 'STOCK_IN' | 'STOCK_OUT' | 'DAMAGE' | 'CORRECTION';

export interface StockAdjustmentPayload {
    productId: number;
    adjustmentType: StockAdjustmentType;
    quantityChange: number; // positive for addition, negative for reduction
    reason?: string;
}

export interface StockAdjustmentRecord {
    id: number;
    productId: number;
    adjustmentType: StockAdjustmentType;
    quantityChange: number;
    previousStock: number;
    newStock: number;
    reason?: string | null;
    createdAt: string;
}

export interface StockAdjustmentResponse {
    message: string;
    data: {
        adjustmentRecord: StockAdjustmentRecord;
        currentStock: number;
    };
}

export interface StockHistoryResponse {
    productId: number;
    count: number;
    history: StockAdjustmentRecord[];
}

// 1. POST /api/stock/adjust
export const adjustStock = async (payload: StockAdjustmentPayload): Promise<StockAdjustmentResponse> => {
    const response = await axiosClient.post('/stock/adjust', payload);
    return response.data;
};

// 2. GET /api/stock/history/:productId
export const fetchStockHistory = async (productId: number): Promise<StockHistoryResponse> => {
    const response = await axiosClient.get(`/stock/history/${productId}`);
    return response.data;
};

// --- TANSTACK QUERY HOOKS ---

export const useAdjustStock = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: adjustStock,
        onSuccess: (_data, variables) => {
            // Invalidate product cache so all stock numbers update across app
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-history', variables.productId] });
        },
    });
};

export const useGetStockHistory = (productId?: number) => {
    return useQuery({
        queryKey: ['stock-history', productId],
        queryFn: () => fetchStockHistory(productId!),
        enabled: !!productId,
    });
};

