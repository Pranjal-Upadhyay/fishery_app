'use client';

import { useEffect, useRef } from 'react';

/**
 * Auto-logout after a period of inactivity.
 *
 * Why: a long-lived JWT (8h) is convenient, but if an officer walks away
 * from their desk we shouldn't keep the session open. 30 minutes of no
 * activity (no mouse / keyboard / scroll / touch) triggers logout.
 *
 * Activity reset is throttled to ~5 second granularity so we don't churn
 * a timer setter on every mousemove.
 */

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const RESET_THROTTLE_MS = 5_000;

const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'wheel',
];

export function IdleWatcher({ onIdle }: { onIdle: () => void }) {
  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current);
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, IDLE_TIMEOUT_MS - elapsed);
      timerRef.current = setTimeout(() => {
        if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
          onIdle();
        } else {
          schedule();
        }
      }, remaining);
    }

    function onActivity() {
      const now = Date.now();
      if (now - lastActivityRef.current < RESET_THROTTLE_MS) return;
      lastActivityRef.current = now;
      schedule();
    }

    ACTIVITY_EVENTS.forEach((ev) =>
      document.addEventListener(ev, onActivity, { passive: true }),
    );
    schedule();

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => document.removeEventListener(ev, onActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onIdle]);

  return null;
}
