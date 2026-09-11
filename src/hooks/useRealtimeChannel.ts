import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface RealtimeChannelConfig {
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  table: string;
  filter?: string;
}

/**
 * Centralized Realtime hook with auto-reconnect, visibility API (bfcache) and error handling.
 *
 * - Suspends channel on document.hidden / pagehide to avoid Back-Forward Cache freezing issues.
 * - Reconnects cleanly on visibilitychange (visible) and pageshow.
 * - Silences CHANNEL_ERROR logs when document is hidden.
 * - Caps reconnection attempts and avoids competing reconnect timer loops.
 */
export function useRealtimeChannel(
  channelName: string | null | undefined,
  config: RealtimeChannelConfig,
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  onStatus?: (status: "connected" | "reconnecting" | "error") => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<any>(null);
  const isSubscribingRef = useRef(false);
  const MAX_RETRIES = 10;

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const cleanupChannel = useCallback(() => {
    clearRetryTimer();
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch {
        /* noop */
      }
      channelRef.current = null;
    }
  }, []);

  const subscribe = useCallback(() => {
    if (!channelName) {
      cleanupChannel();
      return;
    }

    // Do not initiate channel creation if document is hidden / frozen in bfcache
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      cleanupChannel();
      return;
    }

    cleanupChannel();
    isSubscribingRef.current = true;

    try {
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes" as any,
          {
            event: config.event,
            schema: config.schema ?? "public",
            table: config.table,
            ...(config.filter ? { filter: config.filter } : {}),
          },
          callback
        )
        .subscribe((status: string) => {
          isSubscribingRef.current = false;
          if (status === "SUBSCRIBED") {
            retriesRef.current = 0;
            onStatus?.("connected");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            const isHidden = typeof document !== "undefined" && document.hidden;
            if (!isHidden) {
              console.warn(
                `[useRealtimeChannel] ${channelName} ${status}. Attempt ${retriesRef.current + 1}/${MAX_RETRIES}`
              );
            }
            onStatus?.("reconnecting");

            // Prevent competing reconnection timers
            clearRetryTimer();

            if (!isHidden && retriesRef.current < MAX_RETRIES) {
              retriesRef.current += 1;
              retryTimerRef.current = setTimeout(() => {
                subscribe();
              }, 3000 * Math.min(retriesRef.current, 5)); // backoff up to 15s
            } else if (!isHidden) {
              console.error(`[useRealtimeChannel] ${channelName} — max retries reached.`);
              onStatus?.("error");
            }
          }
        });

      channelRef.current = channel;
    } catch (err) {
      isSubscribingRef.current = false;
      if (typeof document !== "undefined" && !document.hidden) {
        console.warn(`[useRealtimeChannel] Error subscribing to ${channelName}:`, err);
      }
    }
  }, [channelName, config.event, config.table, config.filter, config.schema, callback, onStatus, cleanupChannel]);

  useEffect(() => {
    subscribe();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cleanupChannel();
      } else if (document.visibilityState === "visible") {
        retriesRef.current = 0;
        subscribe();
      }
    };

    const handlePageHide = () => {
      cleanupChannel();
    };

    const handlePageShow = () => {
      retriesRef.current = 0;
      subscribe();
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", handlePageHide);
      window.addEventListener("pageshow", handlePageShow);
    }

    return () => {
      cleanupChannel();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", handlePageHide);
        window.removeEventListener("pageshow", handlePageShow);
      }
    };
  }, [subscribe, cleanupChannel]);

  return channelRef;
}

