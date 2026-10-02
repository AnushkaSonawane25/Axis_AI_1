import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default async function TermsPage() {
  const user = await getCurrentUser();

  const legalEntity = process.env.LEGAL_ENTITY_NAME || "[CONFIG REQUIRED: LEGAL_ENTITY_NAME]";
  const contactEmail = process.env.CONTACT_EMAIL || "[CONFIG REQUIRED: CONTACT_EMAIL]";
  const registeredAddress =
    process.env.LEGAL_REGISTERED_ADDRESS || "[CONFIG REQUIRED: LEGAL_REGISTERED_ADDRESS]";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12">
        <div className="border border-[#e7e0d6] bg-white rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-bold text-[#18181b] tracking-tight mb-2">
            Terms & Conditions
          </h1>
          <p className="text-xs text-[#71717a] pb-6 border-b border-[#e7e0d6] mb-8">
            Last Updated: October 2, 2026 • Governing Law: Republic of India
          </p>

          <div className="space-y-8 text-sm text-[#3f3f46] leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                1. Service Description
              </h2>
              <p>
                Hinglish Order Desk provides an intake utility platform developed by <strong>{legalEntity}</strong> (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;).
                The platform assists independent shopkeepers in converting casual text messages written by customers into structured, itemized bills
                and counter delivery slips.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                2. Accounts & User Roles
              </h2>
              <p>
                Users must register as either a <strong>Customer</strong> or a <strong>Shopkeeper</strong>.
                Each account is restricted to its designated role.
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                3. Direct Customer-Shopkeeper Relationship & No Warranty
              </h2>
              <div className="p-4 bg-[#fff7ed] border border-[#fed7aa] rounded-md text-[#9a3412] font-medium text-xs leading-relaxed">
                IMPORTANT: Hinglish Order Desk is a software utility platform, not a seller, merchant, or delivery carrier.
                All sales, item quality, product warranties, pricing disputes, packaging, physical deliveries, and payments are strictly direct contracts
                between the Customer and the Shopkeeper. The platform does not guarantee delivery completion, item availability, or payment settlement.
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                4. Automated Parsing & Customer Review Obligation
              </h2>
              <p>
                Order parsing uses algorithmic interpretation and large language models.
                Customers MUST review the itemized order summary, selected pack sizes, and prices before tapping &ldquo;Confirm Order&rdquo;.
                Tapping &ldquo;Confirm Order&rdquo; constitutes your explicit confirmation of the itemized list and bill total.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                5. Shopkeeper Responsibilities for Catalog & Inventory
              </h2>
              <p>
                Shopkeepers are solely responsible for maintaining the accuracy of their product catalog, including product names, pack sizes,
                pricing (in integer paise), stock levels, and store delivery policies.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                6. Acceptable Use Policy
              </h2>
              <p>
                You agree not to submit fraudulent, unlawful, or abusive messages, or attempt prompt injection, denial of service,
                or unauthorized access to data belonging to other shops or users.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                7. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by Indian law, {legalEntity} shall not be liable for any indirect, incidental, or consequential damages
                arising from order fulfillment failures, inaccuracies in parsing, or shopkeeper actions.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                8. Governing Law & Jurisdiction
              </h2>
              <p>
                These Terms are governed by the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts at {registeredAddress}.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-[#18181b] mb-2">
                9. Contact & Inquiries
              </h2>
              <p>
                For inquiries regarding these Terms, contact us at <a href={`mailto:${contactEmail}`} className="text-[#c2410c] underline">{contactEmail}</a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
