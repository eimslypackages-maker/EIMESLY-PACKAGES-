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
            Eimesly Packages, operated by EIMESLY LTD in Kigali, Rwanda, respects your privacy. Customers can browse our product catalogue and initiate orders directly via WhatsApp without creating a website account or submitting payment card details online.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            1. Information We Collect
          </h2>
          <p>
            When you submit a quotation request, contact enquiry, or confirm an order with our sales team via WhatsApp, we record the contact name, phone number, optional email address, business name, delivery details, and packaging specifications required to fulfill your request.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            2. How We Use Information
          </h2>
          <p>
            Customer details are used exclusively to confirm stock availability, prepare wholesale quotations, coordinate delivery or collection in Kigali and across Rwanda, and maintain accurate invoicing records. We do not sell customer data to third parties.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            3. Security & Confidentiality
          </h2>
          <p>
            Administrative access to quotations, customer enquiries, and confirmed order logs is restricted to authorized EIMESLY LTD personnel through role-based authentication.
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
            These Terms & Conditions govern retail orders, wholesale enquiries, and quotation requests initiated through Eimesly Packages (EIMESLY LTD).
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            1. WhatsApp Ordering & Price Confirmation
          </h2>
          <p>
            Displayed retail prices are listed in Rwandan Francs (RWF) where configured. Submitting an Order Now or Wholesale Quote message via WhatsApp opens a direct conversation with our sales team to confirm current stock availability, delivery timelines, and final payment instructions.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            2. Minimum Order Quantities & Wholesale Quotes
          </h2>
          <p>
            Minimum Order Quantities (MOQ) apply as listed on each product page. Commercial and wholesale pricing is quoted directly by our sales representatives upon enquiry and remains valid until the validity date specified on the issued quotation.
          </p>
          <h2 className="text-lg font-semibold text-[#202020] pt-2">
            3. Payment & Delivery
          </h2>
          <p>
            Eimesly Packages does not collect credit or debit card information on this website. Payment and Kigali collection or delivery arrangements are confirmed directly with our authorized sales team via WhatsApp or official company invoice.
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
      q: 'How do I place an order on Eimesly Packages?',
      a: 'Simply browse our catalogue, select your preferred size, variation, packaging unit, and quantity, and click Order Now. WhatsApp will open automatically with your pre-filled product details ready to send to our Kigali sales team.',
    },
    {
      q: 'Do I need to create an account or use a shopping cart?',
      a: 'No. We do not require customer registration, website login, shopping carts, or online card payments. Every product can be ordered directly through WhatsApp.',
    },
    {
      q: 'Do you supply both wholesale and retail customers?',
      a: 'Yes. Individual buyers can order standard packs directly via WhatsApp, while cafés, restaurants, hotels, supermarkets, and caterers can click Request Wholesale Quote for bulk volume pricing.',
    },
    {
      q: 'How do I order products marked "Price on Request"?',
      a: 'Click Order Now or Request Wholesale Quote on the product page to send the item details to our WhatsApp desk, or submit the Request a Quote form for custom packaging specifications.',
    },
    {
      q: 'Can I request custom-branded cups, bags, or takeaway boxes?',
      a: 'Yes. Visit the Wholesale page or Request a Quote page to upload a reference image or logo along with your estimated quantities, or message us directly on WhatsApp.',
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
