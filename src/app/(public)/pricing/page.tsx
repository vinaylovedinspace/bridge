'use client';

import { type FormEvent, useState } from 'react';

const SUPPORT_EMAIL = 'support@welovedinspace.studio';

const liteFeatures = [
  'Student / Client Management',
  'Multi-step Client Admission & Enrollment',
  'Learning & Driving License Management',
  'Vehicle Fleet Management with Document Tracking',
  'Payment Processing (Full, Installments & Pay-later)',
  'Sessions Scheduling & Calendar',
  'Staff Management',
  'Expenses Tracking',
  'Transactions Ledger',
  'RTO Services Integration',
  'Forms Management',
  'Dashboard & Analytics',
  'Branch Configuration & Settings',
];

const proExtras = ['WhatsApp Integration', 'Digilocker Integration'];

function ContactModal({ plan, onClose }: { plan: 'Lite' | 'Pro'; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Interested in ${plan} Plan`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nPlan: ${plan}`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Interested in {plan}?</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Fill in your details and we&apos;ll reach out to get you onboarded.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="+91 XXXXXXXXXX"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 rounded-lg bg-primary text-sm text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<'Lite' | 'Pro' | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pricing</h1>
          <p className="text-sm text-gray-600">
            Simple, transparent pricing. Choose the plan that fits your driving school.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lite Plan */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">Lite</h2>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-3xl font-bold text-gray-900">₹3,000</span>
                <span className="text-gray-500 mb-1 text-sm">/month</span>
              </div>
            </div>

            <ul className="space-y-2 flex-1">
              {liteFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setSelectedPlan('Lite')}
              className="mt-5 w-full py-2 px-4 rounded-lg border border-gray-300 text-sm text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
            >
              Get in Touch
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-xl shadow border-2 border-primary p-5 flex flex-col relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-0.5 rounded-full">
              Most Popular
            </span>

            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">Pro</h2>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-3xl font-bold text-gray-900">₹5,000</span>
                <span className="text-gray-500 mb-1 text-sm">/month</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-3">Everything in Lite, plus:</p>

            <ul className="space-y-2 flex-1">
              {liteFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
              {proExtras.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-gray-700 font-semibold">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setSelectedPlan('Pro')}
              className="mt-5 w-full py-2 px-4 rounded-lg bg-primary text-sm text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Get in Touch
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Have questions about our pricing?{' '}
            <a
              href="mailto:support@welovedinspace.studio"
              className="text-blue-600 hover:underline"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>

      {selectedPlan && <ContactModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
    </div>
  );
}
