// client/src/hooks/useApi.js
import { useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

export function useApi() {
  const { token, logout } = useAuth();

  const api = useCallback(
    async (method, endpoint, data = null) => {
      try {
        const config = {
          method,
          url: `${API_URL}${endpoint}`,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          ...(data ? { data } : {}),
        };

        const response = await axios(config);
        return response.data;
      } catch (error) {
        if (error.response?.status === 401) {
          logout();
        }
        throw error.response?.data || { message: 'Network error' };
      }
    },
    [token, logout]
  );

  const get = useCallback((endpoint) => api('GET', endpoint), [api]);
  const post = useCallback((endpoint, data) => api('POST', endpoint, data), [api]);
  const put = useCallback((endpoint, data) => api('PUT', endpoint, data), [api]);

  return { get, post, put, api };
}

export default useApi;
