
import Link from "next/link";

export default function TermsOfService() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "40px auto",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.8,
        color: "#192341",
        background: "#fff",
      }}
    >
      <h1>Terms of Service</h1>
      <p>Last updated: October 2026</p>

      <h2>1. Purpose of This Website</h2>
      <p>
        This website provides information about the Stock Learners
        educational community and offers a link to request access to
        its Telegram channel.
      </p>

      <h2>2. Educational Information Only</h2>
      <p>
        Market commentary, educational updates, and other information
        are provided for general educational and informational
        purposes only. They are not personalized investment advice
        or a recommendation to buy or sell any security.
      </p>

      <h2>3. Market Risks</h2>
      <p>
        Investments in securities markets involve risk, including the
        possible loss of capital. Past performance does not guarantee
        future results. Please consult an appropriately qualified
        professional where necessary.
      </p>

      <h2>4. No Guarantee</h2>
      <p>
        We do not guarantee profits, returns, accuracy, completeness,
        or uninterrupted availability of any information or service.
      </p>

      <h2>5. Telegram Access</h2>
      <p>
        Following an invite link or submitting a join request does not
        guarantee admission to the Telegram community. Access may
        depend on administrator approval and Telegram&apos;s own rules.
      </p>

      <h2>6. Third-Party Services</h2>
      <p>
        Telegram, Meta, and other third-party services are governed
        by their own terms, policies, and availability. We are not
        responsible for changes or interruptions in those services.
      </p>

      <h2>7. Responsible Use</h2>
      <p>
        You agree not to misuse this website, interfere with its
        operation, or attempt unauthorized access to its systems.
      </p>

      <h2>8. Contact</h2>
      <p>
        For questions about these terms, contact the website operator
        using the contact information provided on the main website.
      </p>

      <p>
        Before publication, review these terms for accuracy and add
        the operator&apos;s actual contact details. Do not claim regulatory
        registration or authorization unless it is valid and verified.
      </p>

      <p>
        <Link href="/">Back to Home</Link>
      </p>
    </main>
  );
}
