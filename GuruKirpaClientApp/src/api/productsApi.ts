import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';

export interface Product {
    id?: number;
    serialNumber: string;
    brand: string;
    productType: string;
    subType?: string | null;
    modelNumber: string;
    unitPrice: number;
    costPrice?: number;
    stock: number;
    taxRate: number;
    sku?: string | null;
    specs?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}

// 1. Fetch Products API Call
export const fetchProducts = async (): Promise<Product[]> => {
    const response = await axiosClient.get('/products?limit=100');
    // Handle array directly or unwrap common API wrapper keys
    if (Array.isArray(response.data)) {
        return response.data;
    }
    return response.data?.data || response.data?.products || [];
};

// 2. Create Product API Call
export const createProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const response = await axiosClient.post('/products', productData);
    return response.data;
};

// 3. Update Product API Call
export const updateProduct = async ({ id, ...data }: Partial<Product> & { id: number }): Promise<Product> => {
    const response = await axiosClient.put(`/products/${id}`, data);
    return response.data;
};

// 4. Delete Product API Call
export const deleteProduct = async (id: number): Promise<void> => {
    await axiosClient.delete(`/products/${id}`);
};

// 5. Fetch Low Stock Products API Call
export interface LowStockResponse {
    threshold: number;
    count: number;
    data: Product[];
}

export const fetchLowStockProducts = async (threshold: number = 5): Promise<Product[]> => {
    const response = await axiosClient.get(`/products/low-stock?threshold=${threshold}`);
    if (Array.isArray(response.data)) {
        return response.data;
    }
    return response.data?.data || [];
};

// --- TANSTACK QUERY HOOKS ---

// Hook to get products list (with caching)
export const useGetProducts = () => {
    return useQuery({
        queryKey: ['products'],
        queryFn: fetchProducts,
    });
};

// Hook to get low-stock products
export const useGetLowStockProducts = (threshold: number = 5) => {
    return useQuery({
        queryKey: ['low-stock-products', threshold],
        queryFn: () => fetchLowStockProducts(threshold),
    });
};

// Hook to add a product (invalidates cache to auto-refresh list)
export const useCreateProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock-products'] });
        },
    });
};

// Hook to update a product
export const useUpdateProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock-products'] });
        },
    });
};

// Hook to delete a product
export const useDeleteProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock-products'] });
        },
    });
};