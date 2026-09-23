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
  // Responses can arrive out of order (e.g. a slow request for the previous
  // filter finishing after the one for the new filter) — only apply a
  // response if no newer request has already been applied.
  const lastStartedRef = useRef(0);
  const lastAppliedRef = useRef(0);

  const run = useCallback(() => {
    const seq = ++lastStartedRef.current;
    fetchFnRef
      .current()
      .then((result) => {
        if (seq < lastAppliedRef.current) return;
        lastAppliedRef.current = seq;
        setData(result);
        setError(null);
      })
      .catch((err: Error) => {
        if (seq < lastAppliedRef.current) return;
        lastAppliedRef.current = seq;
        setError(err.message);
      })
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
