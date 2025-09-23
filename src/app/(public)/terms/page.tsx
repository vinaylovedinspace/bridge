import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Bridge Driving School',
  description: 'Terms of service for WhatsApp Business integration and driving school services',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>

        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            These Terms of Service govern your use of Bridge Driving School services, including our
            WhatsApp Business messaging integration.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Acceptance of Terms</h2>
          <p className="text-gray-700 mb-6">
            By using our services, including messaging us via WhatsApp, you agree to be bound by
            these Terms of Service and our Privacy Policy. If you do not agree to these terms,
            please do not use our services.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            WhatsApp Business Communication
          </h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Opt-in Consent</h3>
          <p className="text-gray-700 mb-6">
            By providing your phone number and initiating communication with us via WhatsApp, you
            consent to receive messages from Bridge Driving School. This includes service updates,
            appointment reminders, promotional content, and customer support communications.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Message Frequency</h3>
          <p className="text-gray-700 mb-6">
            Message frequency varies based on your service needs and preferences. You may receive
            appointment confirmations, reminders, progress updates, and occasional promotional
            messages.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Opt-out</h3>
          <p className="text-gray-700 mb-6">
            You can opt-out of WhatsApp communications at any time by replying &ldquo;STOP&rdquo; to
            any message or contacting us directly. Opting out may affect our ability to provide
            certain services and updates.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Driving School Services</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Service Provision</h3>
          <p className="text-gray-700 mb-6">
            Bridge Driving School provides driving instruction, license assistance, and related
            services. All services are subject to availability and our operational policies.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Payment Terms</h3>
          <p className="text-gray-700 mb-4">Payment terms include:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>Full payment in advance</li>
            <li>Installment plans (2-part payments)</li>
            <li>Pay-later options where available</li>
            <li>All fees are non-refundable unless otherwise specified</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Cancellation Policy</h3>
          <p className="text-gray-700 mb-6">
            Lessons must be cancelled at least 24 hours in advance. Late cancellations may result in
            charges. We reserve the right to cancel or reschedule lessons due to weather, vehicle
            maintenance, or other operational requirements.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">User Responsibilities</h2>
          <p className="text-gray-700 mb-4">You agree to:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>Provide accurate and complete information</li>
            <li>Maintain the confidentiality of your account</li>
            <li>Use our services in compliance with all applicable laws</li>
            <li>Respect our staff and other customers</li>
            <li>Follow all safety instructions and guidelines</li>
            <li>Not use our WhatsApp service for spam or unauthorized purposes</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Prohibited Uses</h2>
          <p className="text-gray-700 mb-4">You may not:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>Use our services for any unlawful purpose</li>
            <li>Share inappropriate, offensive, or harmful content</li>
            <li>Attempt to interfere with our systems or services</li>
            <li>Impersonate our staff or misrepresent your identity</li>
            <li>Use our WhatsApp service to contact other customers</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            Data Protection and Privacy
          </h2>
          <p className="text-gray-700 mb-6">
            We are committed to protecting your privacy and personal data. Our data collection, use,
            and protection practices are detailed in our Privacy Policy. By using our services, you
            consent to our data practices as described.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Limitation of Liability</h2>
          <p className="text-gray-700 mb-6">
            Bridge Driving School&apos;s liability is limited to the maximum extent permitted by
            law. We are not responsible for indirect, incidental, or consequential damages arising
            from your use of our services.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Service Modifications</h2>
          <p className="text-gray-700 mb-6">
            We reserve the right to modify, suspend, or discontinue any aspect of our services at
            any time. We will provide reasonable notice of significant changes that may affect you.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">WhatsApp Business Terms</h2>
          <p className="text-gray-700 mb-6">
            Our WhatsApp Business integration is subject to WhatsApp&apos;s terms of service. Your
            use of WhatsApp to communicate with us is also governed by WhatsApp&apos;s applicable
            terms and privacy policy.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Governing Law</h2>
          <p className="text-gray-700 mb-6">
            These Terms of Service are governed by the laws of [Your Jurisdiction]. Any disputes
            will be resolved in the courts of [Your Jurisdiction].
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Changes to Terms</h2>
          <p className="text-gray-700 mb-6">
            We may update these Terms of Service from time to time. We will notify you of
            significant changes via WhatsApp, email, or our website. Continued use of our services
            constitutes acceptance of the updated terms.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Information</h2>
          <p className="text-gray-700 mb-4">
            If you have questions about these Terms of Service, please contact us:
          </p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-gray-700 mb-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:support@bridge-driving.com" className="text-blue-600 hover:underline">
                support@welovedinspace.studio
              </a>
            </p>
            <p className="text-gray-700">
              <strong>Phone:</strong> +91 9136769724
            </p>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-400">
            <p className="text-sm text-blue-800">
              <strong>Last Updated:</strong>{' '}
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
