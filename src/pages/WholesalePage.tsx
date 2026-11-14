import React, { useState } from 'react';
import { Building2, CheckCircle2, Layers, MessageCircle, Package } from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import { apiFetch } from '../lib/api';

export function WholesalePage() {
  const { navigate, bootstrap } = useApp();
  const settings = bootstrap?.settings;
  const categories = bootstrap?.categories || [];

  useDocumentMeta(
    'Wholesale Packaging Supply | Eimesly Packages',
    'Bulk food packaging solutions for restaurants, hotels, cafés, supermarkets, and catering businesses in Kigali, Rwanda.'
  );

  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Wholesale Bulk Packaging Enquiry');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const cleanWhatsapp = (settings?.whatsappNumber || '').replace(/[^0-9]/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiFetch('/api/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          enquiryType: 'wholesale',
          fullName,
          businessName,
          email,
          phone,
          subject,
          message,
        }),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to send wholesale enquiry'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF]">
      <section className="bg-[#F3EEE6] border-b border-[#202020]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="max-w-3xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
              B2B & Commercial Accounts
            </p>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#202020] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Packaging Solutions That Grow With Your Business
            </h1>
            <p className="text-base sm:text-lg text-[#202020]/75 leading-relaxed">
              Eimesly Packages partners with cafés, restaurants, hotels, supermarkets, and catering organizations across Kigali and Rwanda to provide dependable bulk food-service packaging.
            </p>
            <div className="flex flex-wrap gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => navigate('/request-quote')}
                className="px-6 py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333]"
              >
                Request Bulk Quotation
              </button>
              {cleanWhatsapp && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 text-sm font-semibold border border-[#202020]/25 bg-[#FFFFFF] text-[#202020] rounded-md inline-flex items-center gap-2 hover:bg-[#F5F5F5]"
                >
                  <MessageCircle className="w-4 h-4 text-[#B58B61]" />
                  WhatsApp Sales Team
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits of Buying in Bulk */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-b border-[#202020]/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-[#F5F5F5] rounded-lg space-y-2.5">
            <Package className="w-6 h-6 text-[#B58B61]" />
            <h2 className="text-base font-semibold text-[#202020]">
              Tiered Wholesale Pricing & MOQ
            </h2>
            <p className="text-sm text-[#202020]/75 leading-relaxed">
              Products configured with Minimum Order Quantities offer lower per-unit wholesale rates for businesses ordering by the carton or bulk pack.
            </p>
          </div>
          <div className="p-6 bg-[#F5F5F5] rounded-lg space-y-2.5">
            <Layers className="w-6 h-6 text-[#B58B61]" />
            <h2 className="text-base font-semibold text-[#202020]">
              Custom & Branded Packaging Enquiries
            </h2>
            <p className="text-sm text-[#202020]/75 leading-relaxed">
              Need branded coffee cups, printed kraft bags, or specific container capacities? Submit custom packaging enquiries directly without creating an account.
            </p>
          </div>
          <div className="p-6 bg-[#F5F5F5] rounded-lg space-y-2.5">
            <Building2 className="w-6 h-6 text-[#B58B61]" />
            <h2 className="text-base font-semibold text-[#202020]">
              Dedicated Hospitality Support
            </h2>
            <p className="text-sm text-[#202020]/75 leading-relaxed">
              Coordinate recurring restocks and formal quotations with our Kigali team for hotels, restaurants, coffee shops, and events.
            </p>
          </div>
        </div>
      </section>

      {/* Wholesale Product Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-b border-[#202020]/10">
        <h2 className="text-2xl font-bold text-[#202020] mb-6">
          Wholesale Product Categories
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/categories/${c.slug}`)}
              className="p-4 text-left border border-[#202020]/10 rounded-lg hover:border-[#B58B61] hover:bg-[#F3EEE6]/40 transition-colors"
            >
              <p className="text-sm font-semibold text-[#202020]">{c.name}</p>
              <p className="text-xs text-[#202020]/60 mt-1 line-clamp-2">
                {c.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Bulk-Order Enquiry Form */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#202020]">
            Bulk-Order & Custom Packaging Enquiry
          </h2>
          <p className="text-sm text-[#202020]/70 mt-1">
            Submit wholesale enquiries directly without creating an account.
          </p>
        </div>

        {submitted ? (
          <div className="p-8 bg-[#F3EEE6] border border-[#202020]/10 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-9 h-9 text-[#B58B61] mx-auto" />
            <h3 className="text-xl font-bold text-[#202020]">
              Wholesale Enquiry Received
            </h3>
            <p className="text-sm text-[#202020]/75">
              Thank you. Our wholesale desk will review your requirements and contact you shortly.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="border border-[#202020]/10 rounded-xl p-6 sm:p-8 space-y-5"
          >
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Contact Name *
                </label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Business Name *
                </label>
                <input
                  required
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Business Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                Enquiry Topic *
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md bg-[#FFFFFF]"
              >
                <option value="Wholesale Bulk Packaging Enquiry">
                  Wholesale Bulk Packaging Enquiry
                </option>
                <option value="Custom Branded Packaging Enquiry">
                  Custom Branded Packaging Enquiry
                </option>
                <option value="Recurring Hospitality Supply Contract">
                  Recurring Hospitality Supply Contract
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                Products, Estimated Monthly Volumes & Requirements *
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Submit Wholesale Enquiry'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
