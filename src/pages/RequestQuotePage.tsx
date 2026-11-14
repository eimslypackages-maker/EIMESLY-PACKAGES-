import React, { useState } from 'react';
import { CheckCircle2, MessageCircle, Upload, X } from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { uploadImageFile } from '../lib/upload';
import {
  buildWhatsAppUrl,
  buildWholesaleQuoteMessage,
  trackWhatsAppClick,
} from '../lib/whatsapp';
import type { Quotation } from '../shared/types';

export function RequestQuotePage() {
  const { path, user, navigate, bootstrap } = useApp();
  const settings = bootstrap?.settings;
  const sp = new URLSearchParams(path.split('?')[1] || '');

  useDocumentMeta(
    'Request a Quotation | Eimesly Packages',
    'Request bulk or custom packaging quotations for coffee cups, drinking straws, takeaway containers, and food packaging in Kigali, Rwanda.'
  );

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [companyName, setCompanyName] = useState(user?.businessName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [productInterested, setProductInterested] = useState(
    sp.get('product') || ''
  );
  const [productId] = useState(sp.get('productId') || '');
  const [estimatedQuantity, setEstimatedQuantity] = useState('500');
  const [preferredSize, setPreferredSize] = useState(sp.get('size') || '');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedQuote, setSubmittedQuote] = useState<Quotation | null>(null);

  const whatsappQuoteUrl = buildWhatsAppUrl(
    settings,
    buildWholesaleQuoteMessage({
      productName: productInterested || 'Wholesale Packaging Supply',
      requiredQuantity: estimatedQuantity || '500',
      businessName: companyName,
      location: settings?.address || 'Kigali, Rwanda',
      selectedSize: preferredSize,
      template: settings?.whatsappWholesaleMessage,
    })
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const uploaded = await uploadImageFile(file, 'Quotation reference');
      setReferenceImageUrl(uploaded.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ quotation: Quotation }>('/api/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          companyName,
          phone,
          email,
          productInterested,
          productId: productId ? Number(productId) : null,
          estimatedQuantity: Number(estimatedQuantity || 1),
          preferredSize,
          additionalRequirements,
          referenceImageUrl,
        }),
      });
      setSubmittedQuote(res.quotation);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit quotation request'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] min-h-[75vh]">
      <div className="bg-[#F3EEE6] border-b border-[#202020]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
              Wholesale & Custom Supply
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[#202020] tracking-tight">
              Request a Packaging Quotation
            </h1>
            <p className="mt-2 text-base text-[#202020]/75 max-w-2xl">
              Share the packaging items, estimated quantities, and sizes your business requires, or send your wholesale quote request instantly on WhatsApp.
            </p>
          </div>
          {whatsappQuoteUrl ? (
            <a
              href={whatsappQuoteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackWhatsAppClick({
                  eventType: 'wholesale_quote',
                  productId: productId ? Number(productId) : null,
                  productName: productInterested || 'Wholesale Quotation',
                  selectedSize: preferredSize,
                  quantity: Math.max(1, Number(estimatedQuantity || 1)),
                  sourcePage: 'request_quote',
                })
              }
              className="px-5 py-3 text-xs font-semibold uppercase tracking-wide bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-4 h-4 text-[#B58B61]" />
              Quote on WhatsApp
            </a>
          ) : null}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {submittedQuote ? (
          <div className="bg-[#F3EEE6] border border-[#202020]/10 rounded-xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-[#B58B61] mx-auto" />
            <h2 className="text-2xl font-bold text-[#202020]">
              Quotation Request Submitted
            </h2>
            <p className="text-sm text-[#202020]/75 max-w-md mx-auto">
              Reference Number:{' '}
              <strong className="font-mono text-[#202020]">
                {submittedQuote.quoteNumber}
              </strong>
              . Our sales team is reviewing your specifications and will respond promptly.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setSubmittedQuote(null)}
                className="px-5 py-2.5 text-sm font-medium border border-[#202020]/20 bg-[#FFFFFF] rounded-md"
              >
                Submit Another Request
              </button>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="px-5 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
              >
                Browse Products
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="border border-[#202020]/10 rounded-xl p-6 sm:p-8 space-y-6 bg-[#FFFFFF]"
          >
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Customer Name *
                </label>
                <input
                  required
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Company / Business Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Café, restaurant, hotel, or organization"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Product Interested In *
                </label>
                <input
                  required
                  type="text"
                  value={productInterested}
                  onChange={(e) => setProductInterested(e.target.value)}
                  placeholder="e.g. Double-Wall Kraft Coffee Cups, Paper Straws, Meal Boxes"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Estimated Quantity *
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={estimatedQuantity}
                  onChange={(e) => setEstimatedQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md tabular-nums focus:outline-none focus:border-[#B58B61]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                Preferred Packaging Size / Specifications
              </label>
              <input
                type="text"
                value={preferredSize}
                onChange={(e) => setPreferredSize(e.target.value)}
                placeholder="e.g. 12 oz with black sip lids, 750 ml kraft bowl"
                className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                Additional Requirements
              </label>
              <textarea
                rows={4}
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="Include custom printing details, delivery schedule, or recurring supply notes..."
                className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md focus:outline-none focus:border-[#B58B61]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202020]/75 mb-2">
                Upload Reference Image (Optional)
              </label>
              {referenceImageUrl ? (
                <div className="flex items-center gap-4 p-3 bg-[#F5F5F5] rounded-md border border-[#202020]/15">
                  <img
                    src={referenceImageUrl}
                    alt="Uploaded reference"
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 text-xs text-[#202020]/75">
                    Reference image attached
                  </div>
                  <button
                    type="button"
                    onClick={() => setReferenceImageUrl('')}
                    className="p-1.5 text-[#202020]/60 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2.5 px-4 py-5 border-2 border-dashed border-[#202020]/20 rounded-lg cursor-pointer hover:border-[#B58B61] transition-colors bg-[#F5F5F5]/50">
                  <Upload className="w-4 h-4 text-[#B58B61]" />
                  <span className="text-sm text-[#202020]/75">
                    {uploading
                      ? 'Uploading image...'
                      : 'Choose image from device (JPG, PNG, WebP)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting Request...' : 'Submit Quotation Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
