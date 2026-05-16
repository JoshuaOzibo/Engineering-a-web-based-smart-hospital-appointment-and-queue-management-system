/**
 * useQueueSSE.ts — React hook that opens an EventSource SSE connection
 * to GET /queue/live/:deptId and streams live QueueState updates.
 *
 * Automatically reconnects if the connection drops.
 * Safe to use with SSR: EventSource is only opened inside useEffect.
 */
import { useEffect, useRef, useState } from "react";
import type { QueueState } from "./api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export function useQueueSSE(deptId: number | string | null): QueueState | null {
  const [state, setState] = useState<QueueState | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!deptId) return;

    function connect() {
      const es = new EventSource(`${BASE_URL}/queue/live/${deptId}`);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as QueueState;
          setState(data);
        } catch {/* ignore malformed frames */}
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 3s if the connection drops
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [deptId]);

  return state;
}
