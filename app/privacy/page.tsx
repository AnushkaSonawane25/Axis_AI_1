import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default async function PrivacyPolicyPage() {
  const user = await getCurrentUser();

  const legalEntity = process.env.LEGAL_ENTITY_NAME || "[CONFIG REQUIRED: LEGAL_ENTITY_NAME]";
  const contactEmail = process.env.CONTACT_EMAIL || "[CONFIG REQUIRED: CONTACT_EMAIL]";
  const grievanceOfficer =
    process.env.GRIEVANCE_OFFICER_NAME || "[CONFIG REQUIRED: GRIEVANCE_OFFICER_NAME]";
  const grievanceEmail =
    process.env.GRIEVANCE_OFFICER_EMAIL || contactEmail;
  const grievancePhone =
    process.env.GRIEVANCE_OFFICER_PHONE || "[CONFIG REQUIRED: GRIEVANCE_OFFICER_PHONE]";
  const registeredAddress =
    process.env.LEGAL_REGISTERED_ADDRESS || "[CONFIG REQUIRED: LEGAL_REGISTERED_ADDRESS]";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12">
        <div className="border border-[#e7e0d6] bg-white rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-bold text-[#18181b] tracking-tight mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs text-[#71717a] pb-6 border-b border-[#e7e0d6] mb-8">
            Last Updated: October 2, 2026 • Compliant with the Digital Personal Data Protection Act, 2023 (India)
          </p>

          <div className="space-y-8 text-sm text-[#3f3f46] leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                1. Data Fiduciary Identity & Scope
              </h2>
              <p>
                This Privacy Policy describes how <strong>{legalEntity}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;),
                registered at {registeredAddress}, collects, processes, and protects personal data when you use the Hinglish Order Desk
                web application.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                2. Information We Collect
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li><strong>Identity & Contact Information:</strong> Name, email address, password (stored solely as cryptographic hash), phone number, and delivery address.</li>
                <li><strong>Order Intake Data:</strong> Raw order messages sent by customers in Roman Hinglish, English, or Devanagari Hindi.</li>
                <li><strong>Transaction Records:</strong> Ordered items, snapshot quantities, snapshot prices in paise, order status timestamps, and notes.</li>
                <li><strong>Shopkeeper Data:</strong> Store name, store slug, business phone number, counter address, delivery terms, and product catalog items with prices and stock quantities.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                3. Purpose of Processing
              </h2>
              <p>
                We process your personal data strictly for:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>Authenticating user sessions and providing role-based order desks (Customer vs Shopkeeper).</li>
                <li>Parsing unstructured casual order messages into catalog-matched item lists.</li>
                <li>Facilitating direct communication, clarification questions, and counter receipts between customers and local shopkeepers.</li>
                <li>Maintaining immutable audit logs for transaction verification.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                4. Third-Party LLM Provider & Data Disclosure
              </h2>
              <p>
                To convert casual Hinglish messages into structured items, the text of your order message (along with item names and quantity hints)
                is transmitted securely via HTTPS to an external Large Language Model (LLM) inference provider (such as Google Gemini).
                Personal identifying information such as customer passwords or payment credentials are never sent to the LLM.
                All calculations of money, prices, and stock decrement occur strictly on our local server and database, never by the LLM.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                5. Cookies & Tracking
              </h2>
              <p>
                We use exactly one functional cookie (<code>hinglish_session</code>) to maintain your authenticated login session.
                This cookie is configured with <code>httpOnly</code>, <code>SameSite=Lax</code>, and <code>Secure</code> flags.
                We do not employ third-party advertising trackers, cross-site tracking pixels, or behavioral analytics cookies.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                6. Data Retention & Permanent Account Deletion
              </h2>
              <p>
                We retain your account details and order records as long as your account remains active.
                You retain the right to permanently delete your account and all associated personal data at any time from your account Settings.
                Upon requesting deletion, your user record, active sessions, order history, and messages are permanently erased from the database (hard cascade deletion).
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                7. Security Measures
              </h2>
              <p>
                We implement industry-standard technical and operational safeguards, including bcrypt cryptographic password hashing (salt factor 10),
                parameterized SQL queries via PostgreSQL, rate limiting on authentication and parsing endpoints, and strict row-level authorization checks.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                8. Your Rights Under India&apos;s DPDP Act, 2023
              </h2>
              <p>
                As a Data Principal under the Digital Personal Data Protection Act, 2023, you have:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2">
                <li>The right to access a summary of personal data processed by us.</li>
                <li>The right to correction and erasure of your personal data.</li>
                <li>The right to grievance redressal.</li>
                <li>The right to nominate an individual in the event of death or incapacity.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                9. Grievance Redressal Officer
              </h2>
              <div className="p-4 bg-[#faf8f5] rounded-md border border-[#e7e0d6] space-y-1 text-xs">
                <p><strong>Grievance Officer:</strong> {grievanceOfficer}</p>
                <p><strong>Email:</strong> {grievanceEmail}</p>
                <p><strong>Phone:</strong> {grievancePhone}</p>
                <p><strong>Postal Address:</strong> {registeredAddress}</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
