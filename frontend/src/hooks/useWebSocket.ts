import { useEffect, useRef } from 'react';
import { useQueryClient } from 'react-query';
import { useAppStore } from '../store/useAppStore';

type WsEvent = {
  type: 'reservation_updated' | 'waitlist_promoted' | 'notification' | 'seats_changed' | 'connected';
  payload?: Record<string, unknown>;
};

function wsBaseUrl(): string {
  const env = (import.meta as any).env?.VITE_WS_URL as string | undefined;
  if (env) return env;
  // Same-origin /ws is proxied to the API in Vite dev
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

/**
 * Single authenticated WebSocket for live reservation, waitlist, seat, and notification updates.
 * Replaces aggressive polling on authenticated surfaces.
 */
export function useWebSocket() {
  const queryClient = useQueryClient();
  const { currentUser, isAuthenticated } = useAppStore();
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    let cancelled = false;
    let attempt = 0;

    const connect = () => {
      if (cancelled) return;
      const url = `${wsBaseUrl()}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsEvent;
          if (data.type === 'connected') return;

          if (data.type === 'reservation_updated' || data.type === 'waitlist_promoted') {
            queryClient.invalidateQueries(['user-reservations']);
            queryClient.invalidateQueries(['sessions']);
            queryClient.invalidateQueries(['session']);
            queryClient.invalidateQueries(['feed']);
          }
          if (data.type === 'seats_changed') {
            queryClient.invalidateQueries(['sessions']);
            queryClient.invalidateQueries(['session']);
            queryClient.invalidateQueries(['feed']);
          }
          if (data.type === 'notification') {
            queryClient.invalidateQueries(['notifications']);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        socketRef.current = null;
        if (cancelled) return;
        attempt += 1;
        const delay = Math.min(10000, 500 * 2 ** Math.min(attempt, 4));
        retryRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [isAuthenticated, currentUser?.id, queryClient]);
}
