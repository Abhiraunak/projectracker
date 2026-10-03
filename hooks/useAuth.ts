'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/auth-api';

export function useAuth() {
  const queryClient = useQueryClient();

  // 1. GET /me
  const { data: user, isLoading: isUserLoading, error: userError } = useQuery({
    queryKey: ['authUser'],
    queryFn: authApi.getMe,
    retry: false, // Don't retry if it fails (user is just not logged in)
  });

  // 2. POST /register
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      // Optional: Automatically log them in or redirect
      console.log('Registered', data);
    },
  });

  // 3. POST /login
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Update the 'authUser' query with the new user data instantly
      // or invalidate the query to force a refetch from /me
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    },
  });

  // 4. POST /logout
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear the user data from the cache on logout
      queryClient.setQueryData(['authUser'], null);
    },
  });

  return {
    user,
    isUserLoading,
    userError,
    register: registerMutation,
    login: loginMutation,
    logout: logoutMutation,
  };
}