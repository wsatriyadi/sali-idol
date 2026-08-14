"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit";

export default function Turnstile({
  onVerify,
  siteKey: siteKeyProp,
}: {
  onVerify: (token: string) => void;
  siteKey?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = siteKeyProp || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;

    function render() {
      if (!window.turnstile || !ref.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token: string) => onVerify(token),
        "error-callback": () => onVerify(""),
        "expired-callback": () => onVerify(""),
      });
    }

    if (window.turnstile) {
      render();
    } else if (!document.querySelector(`script[src^="${SCRIPT_SRC.split("?")[0]}"]`)) {
      window.onloadTurnstileCallback = render;
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    } else {
      window.onloadTurnstileCallback = render;
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) {
    return (
      <p className="text-xs text-amber-400">
        Turnstile belum dikonfigurasi (NEXT_PUBLIC_TURNSTILE_SITE_KEY).
      </p>
    );
  }

  return <div ref={ref} className="flex justify-center" />;
}
