import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';
import type { UserRole } from '../context/AuthContext';

export interface StaffUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
}

export interface SetupStatusResponse {
    isInitialSetup: boolean;
    totalUsers: number;
}

export interface CreateStaffPayload {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
}

// 1. Fetch setup status
export const fetchSetupStatus = async (): Promise<SetupStatusResponse> => {
    const { data } = await axiosClient.get('auth/setup-status');
    return data;
};

// 2. Fetch all staff users
export const fetchStaffUsers = async (): Promise<StaffUser[]> => {
    const { data } = await axiosClient.get('auth/users');
    return data;
};

// 3. TanStack Query hooks
export const useGetSetupStatus = () =>
    useQuery({
        queryKey: ['setup-status'],
        queryFn: fetchSetupStatus,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

export const useGetStaffUsers = () =>
    useQuery({
        queryKey: ['staff-users'],
        queryFn: fetchStaffUsers,
    });

export const useCreateStaffUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateStaffPayload) =>
            axiosClient.post('auth/register', payload).then((r) => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-users'] });
            queryClient.invalidateQueries({ queryKey: ['setup-status'] });
        },
    });
};

export const useDeleteStaffUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            axiosClient.delete(`auth/users/${id}`).then((r) => r.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-users'] });
            queryClient.invalidateQueries({ queryKey: ['setup-status'] });
        },
    });
};

