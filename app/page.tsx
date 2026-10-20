
"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1757564198848437";

const AGENCY_NAME =
  process.env.NEXT_PUBLIC_AGENCY_NAME || "ALEXORA PERFORMANCE";

function cookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [trackingConsent, setTrackingConsent] = useState(false);

  const invitePromiseRef = useRef<Promise<string> | null>(null);

  function prepareInvite(): Promise<string> {
    return fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "prepare" }),
      cache: "no-store",
    }).then(async (response) => {
      const result = await response.json();

      if (!response.ok || !result.inviteUrl) {
        throw new Error("Invite link create nahi ho paya.");
      }

      return result.inviteUrl as string;
    });
  }

  useEffect(() => {
    // Prepare a unique invite while the visitor reads the page.
    const promise = prepareInvite();
    invitePromiseRef.current = promise;

    promise.catch(() => {
      if (invitePromiseRef.current === promise) {
        invitePromiseRef.current = null;
      }
    });
  }, []);

  async function joinTelegram() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      // Reuse the prepared link. Retry preparation if needed.
      let inviteUrl: string;

      try {
        inviteUrl = await (
          invitePromiseRef.current ?? prepareInvite()
        );
      } catch {
        invitePromiseRef.current = null;
        invitePromiseRef.current = prepareInvite();
        inviteUrl = await invitePromiseRef.current;
      }

      if (trackingConsent) {
        const query = new URLSearchParams(window.location.search);

        // Save attribution before opening Telegram so the webhook
        // can find it when the join request arrives.
        const response = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "track",
            inviteUrl,
            fbp: cookieValue("_fbp"),
            fbc: cookieValue("_fbc"),
            fbclid: query.get("fbclid"),
            utm_source: query.get("utm_source"),
            utm_campaign: query.get("utm_campaign"),
            consent: true,
          }),
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Attribution save nahi ho payi.");
        }
      }

      // Do not fire a Subscribe event here.
      // The Telegram webhook handles the actual join request.
      window.location.assign(inviteUrl);
    } catch {
      setMessage(
        "Connection slow hai. Dobara button dabakar try karein."
      );
      setLoading(false);
    }
  }

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${PIXEL_ID}');
          fbq('track','PageView');
        `}
      </Script>

      <main className="page-shell">
        <section
          className="landing-card"
          aria-label="Stock Learners official community"
        >
          <div className="brand-mark" aria-label="Stock Learners logo">
            <div className="brand-words">
              stock<span>Learners</span>
            </div>
          </div>

          <div className="community-pill">
            <span className="community-dot" />
            Official Community
          </div>

          <h1>
            GAUTAM JHA
            <span>(STOCK LEARNERS)</span>
          </h1>

          <p className="intro">
            Join our learning community for market insights,
            educational updates, and stock analysis.
          </p>

          <label className="tracking-consent">
            <input
              type="checkbox"
              checked={trackingConsent}
              onChange={(event) =>
                setTrackingConsent(event.target.checked)
              }
            />
            <span>
              I agree to optional analytics and advertising tracking.
              I can still join without selecting this option.
            </span>
          </label>

          <button
            className="join-button"
            onClick={joinTelegram}
            disabled={loading}
          >
            <span className="telegram-plane" aria-hidden="true">
              ➤
            </span>
            {loading ? "OPENING TELEGRAM..." : "JOIN TELEGRAM CHANNEL"}
          </button>

          {message && (
            <p className="status-message" role="status">
              {message}
            </p>
          )}

          <div className="features">
            <div className="feature">
              <span className="feature-icon">✓</span>
              <span>Free Community</span>
            </div>
            <div className="feature">
              <span className="feature-icon">ϟ</span>
              <span>
                Educational
                <br />
                Updates
              </span>
            </div>
            <div className="feature">
              <span className="feature-icon">↕</span>
              <span>Market Insights</span>
            </div>
          </div>

          <p className="agency">
            AD MANAGED BY <a href="#contact">{AGENCY_NAME}</a>
          </p>

          <footer className="footer">
            <p className="copyright">
              © 2026 • Stock Learners. All Rights Reserved.
            </p>

            <nav className="footer-links" aria-label="Footer">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="mailto:contact@example.com" id="contact">
                Contact Us
              </a>
            </nav>

            <p className="disclaimer">
              <strong>Disclaimer:</strong> Investments in securities
              market are subject to market risks. Read all the related
              documents carefully before investing. We are not SEBI
              registered advisors. Content is strictly for educational
              purposes.
            </p>
          </footer>
        </section>
      </main>
    </>
  );
}
