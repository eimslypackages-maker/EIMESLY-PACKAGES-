import { useDocumentMeta } from '../context/AppContext';

export function PrivacyPolicyPage() {
  useDocumentMeta('Privacy Policy | Eimesly Packages');

  return (
    <div className="bg-[#FFFFFF] py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
          Legal Information
        </p>
        <h1 className="text-3xl font-bold text-[#202020] tracking-tight">
          Privacy Policy
        </h1>
        <div className="space-y-4 text-sm sm:text-base text-[#202020]/80 leading-relaxed">
          <p>
            Eimesly Packages, operated by EIMESLY LTD in Kigali, Rwanda, collects contact, business, and delivery information solely to process orders, prepare wholesale quotations, and respond to customer enquiries.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            1. Information We Collect
          </h2>
          <p>
            When you place an order, request a quotation, create a customer account, or submit a contact enquiry, we record your name, phone number, optional email address, business name, delivery address, and order specifications.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            2. How We Use Information
          </h2>
          <p>
            Customer records are used exclusively to verify availability, issue quotations, coordinate delivery or collection, and maintain order and invoice history. We do not sell customer data to third parties.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            3. Data Security & Access
          </h2>
          <p>
            Administrative access to customer orders and enquiries is protected by role-based authentication. Customers with registered accounts can review and update their profile details at any time.
          </p>
        </div>
      </div>
    </div>
  );
}

export function TermsPage() {
  useDocumentMeta('Terms & Conditions | Eimesly Packages');

  return (
    <div className="bg-[#FFFFFF] py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
          Legal Information
        </p>
        <h1 className="text-3xl font-bold text-[#202020] tracking-tight">
          Terms & Conditions
        </h1>
        <div className="space-y-4 text-sm sm:text-base text-[#202020]/80 leading-relaxed">
          <p>
            These Terms & Conditions govern retail orders, wholesale orders, and quotation requests placed through Eimesly Packages (EIMESLY LTD).
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            1. Pricing, Quotations & Availability
          </h2>
          <p>
            Prices are displayed in Rwandan Francs (RWF) where configured. Listings marked Price on Request or Sample Catalogue Item require formal confirmation by our sales team before payment or dispatch. Quotations remain valid until the validity date specified on the issued quote.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            2. Minimum Order Quantities & Wholesale
          </h2>
          <p>
            Wholesale pricing applies where Minimum Order Quantity (MOQ) thresholds are met. Custom packaging runs are subject to artwork approval and confirmed production quantities.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            3. Payment Verification
          </h2>
          <p>
            Orders are confirmed once payment arrangement is verified through a configured payment method or approved directly by an authorized Eimesly Packages representative.
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqPage() {
  useDocumentMeta('Frequently Asked Questions | Eimesly Packages');

  const faqs = [
    {
      q: 'Do you supply both wholesale and retail customers?',
      a: 'Yes. Individual buyers can order smaller packs where available, while cafés, restaurants, hotels, supermarkets, and caterers can order in bulk or request formal wholesale quotations.',
    },
    {
      q: 'How do I order products marked "Price on Request"?',
      a: 'You can add them to your cart and submit an order for direct price confirmation, or use the Request a Quote page to specify your quantity and packaging sizes.',
    },
    {
      q: 'Do I need an account to place an order or request a quote?',
      a: 'No. Guest checkout and guest quotation requests are fully supported. Creating an account is optional and helps you track orders and view past quotes.',
    },
    {
      q: 'Can I request custom-branded cups, bags, or takeaway boxes?',
      a: 'Yes. Visit the Wholesale page or Request a Quote page and upload a reference image or logo along with your estimated quantities.',
    },
    {
      q: 'Where is Eimesly Packages located?',
      a: 'Eimesly Packages (EIMESLY LTD) operates from Kigali, Rwanda, serving businesses across Rwanda with plans to support East Africa.',
    },
  ];

  return (
    <div className="bg-[#FFFFFF] py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
            Support & Help
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#202020] tracking-tight">
            Frequently Asked Questions
          </h1>
        </div>

        <div className="divide-y divide-[#202020]/10 border-y border-[#202020]/10">
          {faqs.map((item) => (
            <div key={item.q} className="py-5 space-y-2">
              <h2 className="text-base font-semibold text-[#202020]">
                {item.q}
              </h2>
              <p className="text-sm text-[#202020]/75 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
