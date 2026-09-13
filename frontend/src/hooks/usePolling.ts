import { useCallback, useEffect, useRef, useState } from "react";

interface PollingResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

/** Polls fetchFn every intervalMs while mounted. No caching, no retries — errors surface as-is. */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number,
  deps: unknown[] = []
): PollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const run = useCallback(() => {
    fetchFnRef
      .current()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, run, ...deps]);

  return { data, error, loading, refresh: run };
}
