import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL;
const API_BASE = BASE.endsWith("/") ? `${BASE}api` : `${BASE}/api`;

export interface Notification {
  type: string;
  conversationId: number;
  contactName: string;
  contactPhone: string;
  text: string;
  isNew: boolean;
  agentId: number;
}

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotif, setLastNotif] = useState<Notification | null>(null);
  const [location] = useLocation();
  const esRef = useRef<EventSource | null>(null);
  const locationRef = useRef(location);

  useEffect(() => { locationRef.current = location; }, [location]);

  // Clear badge when visiting conversations
  useEffect(() => {
    if (location.startsWith("/app/conversations")) {
      setUnreadCount(0);
    }
  }, [location]);

  const connect = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = `${API_BASE}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data: Notification = JSON.parse(e.data);
        if (data.type === "new_message") {
          setLastNotif(data);
          if (!locationRef.current.startsWith("/app/conversations")) {
            setUnreadCount(c => c + 1);
          }
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Reconnect after 5s on error
      setTimeout(connect, 5000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  return { unreadCount, lastNotif };
}
