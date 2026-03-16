// client/src/hooks/useFetch.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from './useApi';

export function useFetch(endpoint) {
  const { get } = useApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use a ref to avoid re-triggering the effect when `get` changes identity
  const getRef = useRef(get);
  getRef.current = get;

  const fetchData = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getRef.current(endpoint);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export default useFetch;
