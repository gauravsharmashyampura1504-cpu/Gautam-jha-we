"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1757564198848437";
const CHANNEL_TITLE = process.env.NEXT_PUBLIC_CHANNEL_TITLE || "Gautam Jha (Stock Learners)";
const AGENCY_NAME = process.env.NEXT_PUBLIC_AGENCY_NAME || "NetAD Expert";

function cookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function joinTelegram() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const query = new URLSearchParams(window.location.search);
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fbp: cookieValue("_fbp"),
          fbc: cookieValue("_fbc"),
          fbclid: query.get("fbclid"),
          utm_source: query.get("utm_source"),
          utm_campaign: query.get("utm_campaign"),
          consent: "user_clicked_join"
        })
      });
      const result = await response.json();
      if (!response.ok || !result.inviteUrl) {
        throw new Error("Invite link create nahi ho paya.");
      }
      window.location.assign(result.inviteUrl);
    } catch {
      setMessage("Abhi Telegram link generate nahi ho paya. Thodi der baad dobara try karein.");
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
        <section className="landing-card" aria-label="Stock Learners official community">
          <div className="brand-mark" aria-label="Stock Learners logo">
            <div className="brand-words">stock<span>Learners</span></div>
          </div>
          <div className="community-pill"><span className="community-dot" />Official Community</div>
          <h1>
            GAUTAM JHA
            <span>(STOCK LEARNERS)</span>
          </h1>
          <p className="intro">
            Join our learning community for market insights, educational updates, and stock analysis.
          </p>
          <button className="join-button" onClick={joinTelegram} disabled={loading}>
            <span className="telegram-plane" aria-hidden="true">➤</span>
            {loading ? "CREATING LINK..." : "JOIN TELEGRAM CHANNEL"}
          </button>
          {message && <p className="status-message" role="status">{message}</p>}
          <div className="features">
            <div className="feature"><span className="feature-icon">✓</span><span>Free Community</span></div>
            <div className="feature"><span className="feature-icon">ϟ</span><span>Educational<br />Updates</span></div>
            <div className="feature"><span className="feature-icon">↕</span><span>Market Insights</span></div>
          </div>
          <p className="agency">AD MANAGED BY <a href="#contact">{AGENCY_NAME}</a></p>
          <footer className="footer">
            <p className="copyright">© 2026 • Stock Learners. All Rights Reserved.</p>
            <nav className="footer-links" aria-label="Footer">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="mailto:contact@example.com" id="contact">Contact Us</a>
            </nav>
            <p className="disclaimer">
              <strong>Disclaimer:</strong> Investments in securities market are subject to market risks.
              Read all the related documents carefully before investing. We are not SEBI registered
              advisors. Content is strictly for educational purposes.
            </p>
          </footer>
        </section>
      </main>
    </>
  );
}
