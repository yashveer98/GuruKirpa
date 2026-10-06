import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient, API_BASE_URL } from './axiosClient';
import { type Product } from './productsApi';

export interface OrderItemInput {
    productId: number;
    quantity: number;
    unitPrice: number;
    taxRate: number;
}

export interface CreateOrderPayload {
    customerName: string;
    customerPhone?: string;
    customerGstin?: string;
    paymentMethod: 'cash' | 'upi' | 'card' | 'credit';
    items: OrderItemInput[];
    notes?: string;
}

export interface ServerOrder {
    id: number;
    invoiceNumber: string;
    customerName: string;
    customerGstin?: string | null;
    subtotal: string | number;
    taxAmount: string | number;
    grandTotal: string | number;
    paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
    orderStatus?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface OrderLineItem {
    id: number;
    quantity: number;
    unitPrice: string | number;
    taxRate: string | number;
    totalAmount: string | number;
    product: Product;
}

export interface OrderWithItems extends ServerOrder {
    items: OrderLineItem[];
}

export interface OrderResponse {
    id: number;
    invoiceNumber: string;
    totalAmount: number;
    pdfUrl: string;
    order?: ServerOrder;
}

export interface OrdersListResponse {
    pagination: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        limit: number;
    };
    data: ServerOrder[];
}

// 1. Submit Order
export const createOrder = async (payload: CreateOrderPayload): Promise<OrderResponse> => {
    const response = await axiosClient.post('/orders', payload);
    const orderData: ServerOrder = response.data?.order || response.data;

    return {
        id: orderData.id,
        invoiceNumber: orderData.invoiceNumber || `INV-${orderData.id}`,
        totalAmount: Number(orderData.grandTotal || 0),
        pdfUrl: `${API_BASE_URL}/orders/${orderData.id}/pdf`,
        order: orderData,
    };
};

// 2. Fetch All Orders
export const fetchOrders = async (params?: {
    search?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
}): Promise<ServerOrder[]> => {
    const response = await axiosClient.get('/orders', { params: { limit: 100, ...params } });
    if (Array.isArray(response.data)) {
        return response.data;
    }
    return response.data?.data || response.data?.orders || [];
};

// 3. Fetch Single Order Details with Items
export const fetchOrderDetails = async (orderId: number): Promise<OrderWithItems> => {
    const response = await axiosClient.get(`/orders/${orderId}`);
    return response.data;
};

// 4. Update Payment Status
export const updatePaymentStatus = async ({
    orderId,
    paymentStatus,
}: {
    orderId: number;
    paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
}): Promise<ServerOrder> => {
    const response = await axiosClient.patch(`/orders/${orderId}/payment-status`, {
        paymentStatus,
    });
    return response.data?.order || response.data;
};

// --- TANSTACK QUERY HOOKS ---

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
};

export const useGetOrders = (params?: { search?: string; paymentStatus?: string }) => {
    return useQuery({
        queryKey: ['orders', params],
        queryFn: () => fetchOrders(params),
    });
};

export const useGetOrderDetails = (orderId?: number) => {
    return useQuery({
        queryKey: ['order-details', orderId],
        queryFn: () => fetchOrderDetails(orderId!),
        enabled: !!orderId,
    });
};

export const useUpdatePaymentStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updatePaymentStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
    });
};