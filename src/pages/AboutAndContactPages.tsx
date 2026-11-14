import React, { useState } from 'react';
import {
  CheckCircle2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { SmartImage } from '../components/SmartImage';

export function AboutPage() {
  const { navigate, bootstrap } = useApp();
  const content = bootstrap?.content;
  const settings = bootstrap?.settings;

  useDocumentMeta(
    'About Eimesly Packages | Food Packaging Supplier in Kigali, Rwanda',
    'Learn about Eimesly Packages (EIMESLY LTD), supplying practical coffee cups, drinking straws, takeaway containers, and hospitality packaging in Kigali, Rwanda.'
  );

  const paragraphs = (
    content?.aboutDescription ||
    'Eimesly Packages is a packaging supply business focused on providing practical and quality packaging solutions for businesses and individuals. We specialize in coffee cups, clear plastic cups for iced drinks, paper and plastic drinking straws, takeaway containers, and other food-service packaging supplies.\n\nOur goal is to make packaging products accessible to cafés, restaurants, hotels, retailers, and other businesses through convenient ordering and reliable customer service.'
  ).split('\n\n');

  return (
    <div className="bg-[#FFFFFF]">
      <section className="bg-[#F3EEE6] border-b border-[#202020]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
              {settings?.parentCompany || 'EIMESLY LTD'} · {settings?.address || 'Kigali, Rwanda'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#202020] tracking-tight">
              {content?.aboutHeading || 'About Eimesly Packages'}
            </h1>
            <div className="space-y-4 text-base text-[#202020]/80 leading-relaxed">
              {paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#FFFFFF] border border-[#202020]/10">
              <SmartImage
                src="/src/assets/images/cat_coffee_cups_1794679093987.jpg"
                alt="Eimesly Packages coffee cups and hospitality packaging"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-b border-[#202020]/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-[#F5F5F5] rounded-lg space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
              Our Mission
            </p>
            <h2 className="text-xl font-bold text-[#202020]">
              Practical Packaging for Daily Operations
            </h2>
            <p className="text-sm sm:text-base text-[#202020]/75 leading-relaxed">
              {content?.aboutMission ||
                'To supply practical, food-grade packaging products that help hospitality businesses, retailers, and event organizers operate smoothly across Rwanda and the wider region.'}
            </p>
          </div>
          <div className="p-8 bg-[#F5F5F5] rounded-lg space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
              Our Vision
            </p>
            <h2 className="text-xl font-bold text-[#202020]">
              A Trusted Regional Supply Partner
            </h2>
            <p className="text-sm sm:text-base text-[#202020]/75 leading-relaxed">
              {content?.aboutVision ||
                'To become the trusted partner for commercial and retail food-service packaging across East Africa through consistent product availability and attentive service.'}
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-b border-[#202020]/10">
        <h2 className="text-2xl font-bold text-[#202020] mb-8">
          Core Values
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {(
            content?.aboutValues || [
              'Practical product quality suited for daily food-service operations',
              'Clear, responsive wholesale and retail customer support',
              'Flexible ordering for growing cafés, restaurants, and enterprises',
              'Honest specifications and transparent quotation workflows',
            ]
          ).map((val, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-5 border border-[#202020]/10 rounded-lg"
            >
              <CheckCircle2 className="w-5 h-5 text-[#B58B61] shrink-0 mt-0.5" />
              <p className="text-sm sm:text-base text-[#202020] font-medium">
                {val}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Location & Contact CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#202020]">
            Based in {settings?.address || 'Kigali, Rwanda'}
          </h2>
          <p className="text-sm text-[#202020]/70">
            Serving Rwanda with plans for East Africa and international expansion.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-5 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
          >
            Explore Products
          </button>
          <button
            type="button"
            onClick={() => navigate('/contact')}
            className="px-5 py-2.5 text-sm font-semibold border border-[#202020]/20 rounded-md"
          >
            Contact Our Team
          </button>
        </div>
      </section>
    </div>
  );
}

export function ContactPage() {
  const { bootstrap } = useApp();
  const settings = bootstrap?.settings;

  useDocumentMeta(
    'Contact Us | Eimesly Packages',
    'Contact Eimesly Packages in Kigali, Rwanda for wholesale packaging enquiries, quotations, and retail order support.'
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const cleanWhatsapp = (settings?.whatsappNumber || '').replace(/[^0-9]/g, '');

  // Build Google Maps embed URL ONLY when exact location coordinates or embed URL are configured in Admin Settings
  const resolvedMapUrl =
    settings?.mapEmbedUrl?.trim() ||
    (settings?.mapLat && settings?.mapLng
      ? `https://maps.google.com/maps?q=${encodeURIComponent(
          `${settings.mapLat},${settings.mapLng}`
        )}&z=15&output=embed`
      : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiFetch('/api/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          enquiryType: 'contact',
          fullName,
          email,
          phone,
          subject,
          message,
        }),
      });
      setSubmitted(true);
      setFullName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to submit your message'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] min-h-[75vh]">
      <div className="bg-[#F3EEE6] border-b border-[#202020]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B58B61]">
            Get in Touch
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[#202020] tracking-tight">
            Contact Eimesly Packages
          </h1>
          <p className="mt-2 text-base text-[#202020]/75 max-w-2xl">
            Reach out for product specifications, bulk packaging quotations, or order follow-ups in Kigali and across Rwanda.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Contact Form */}
        <div className="lg:col-span-7">
          {submitted ? (
            <div className="p-8 bg-[#F3EEE6] border border-[#202020]/10 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[#B58B61] mx-auto" />
              <h2 className="text-xl font-bold text-[#202020]">
                Message Received
              </h2>
              <p className="text-sm text-[#202020]/75">
                Thank you for contacting Eimesly Packages. Your enquiry has been saved and our team will respond promptly.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-5 py-2.5 text-sm font-semibold bg-[#202020] text-[#FFFFFF] rounded-md"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="border border-[#202020]/10 rounded-xl p-6 sm:p-8 space-y-5"
            >
              <h2 className="text-xl font-bold text-[#202020]">
                Send Us a Message
              </h2>
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                    Full Name *
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
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                    Subject *
                  </label>
                  <input
                    required
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#202020]/20 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#202020]/75 mb-1.5">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
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
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* Right: Contact Details & Configurable Map */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#F5F5F5] border border-[#202020]/10 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#202020]">
              Direct Contact Information
            </h2>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#B58B61] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#202020]">Location</p>
                  <p className="text-[#202020]/75">
                    {settings?.address || 'Kigali, Rwanda'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#B58B61] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#202020]">Phone</p>
                  <p className="text-[#202020]/75">
                    {settings?.phone ? (
                      <a href={`tel:${settings.phone}`} className="hover:underline">
                        {settings.phone}
                      </a>
                    ) : (
                      'Phone number can be configured in System Settings.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#B58B61] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#202020]">Email</p>
                  <p className="text-[#202020]/75">
                    {settings?.email ? (
                      <a href={`mailto:${settings.email}`} className="hover:underline">
                        {settings.email}
                      </a>
                    ) : (
                      'Business email can be configured in System Settings.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-[#B58B61] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#202020]">WhatsApp Business</p>
                  {cleanWhatsapp ? (
                    <a
                      href={`https://wa.me/${cleanWhatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#B58B61] font-medium hover:underline"
                    >
                      Chat on WhatsApp ({settings?.whatsappNumber})
                    </a>
                  ) : (
                    <p className="text-[#202020]/75">
                      WhatsApp link can be configured in System Settings.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {(settings?.instagramUrl || settings?.facebookUrl) && (
              <div className="pt-4 border-t border-[#202020]/10 flex items-center gap-4 text-sm font-medium">
                {settings.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#202020] hover:text-[#B58B61]"
                  >
                    Instagram
                  </a>
                )}
                {settings.facebookUrl && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#202020] hover:text-[#B58B61]"
                  >
                    Facebook
                  </a>
                )}
              </div>
            )}
          </div>

          {resolvedMapUrl && (
            <div className="border border-[#202020]/10 rounded-xl overflow-hidden h-64 bg-[#F5F5F5]">
              <iframe
                title="Eimesly Packages Location Map"
                src={resolvedMapUrl}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
