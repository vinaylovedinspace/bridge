import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Bridge Driving School',
  description: 'Privacy policy for WhatsApp Business integration and data handling practices',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            This Privacy Policy describes how Bridge Driving School collects, uses, and protects
            your personal information when you interact with us through WhatsApp Business messaging.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Information We Collect</h2>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">
            WhatsApp Business Integration
          </h3>
          <p className="text-gray-700 mb-4">
            When you communicate with us through WhatsApp, we may collect:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>Your phone number</li>
            <li>WhatsApp profile name and photo</li>
            <li>Message content you send to us</li>
            <li>Message delivery and read status</li>
            <li>Timestamps of communications</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Driving School Services</h3>
          <p className="text-gray-700 mb-4">For our driving school services, we also collect:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>Personal identification information</li>
            <li>Learning permit and license details</li>
            <li>Payment and billing information</li>
            <li>Vehicle assignment and training records</li>
            <li>Progress and assessment data</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            How We Use Your Information
          </h2>
          <p className="text-gray-700 mb-4">We use your information to:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>Provide customer support and respond to inquiries</li>
            <li>Schedule and manage driving lessons</li>
            <li>Send appointment reminders and updates</li>
            <li>Process payments and manage billing</li>
            <li>Track your learning progress</li>
            <li>Comply with legal and regulatory requirements</li>
            <li>Improve our services and customer experience</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            Data Sharing and Disclosure
          </h2>
          <p className="text-gray-700 mb-4">
            We do not sell, trade, or rent your personal information to third parties. We may share
            your information only in the following circumstances:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>With your explicit consent</li>
            <li>To comply with legal obligations</li>
            <li>
              With service providers who assist in our operations (under strict confidentiality)
            </li>
            <li>To protect our rights, property, or safety</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            WhatsApp Data Processing
          </h2>
          <p className="text-gray-700 mb-6">
            Meta (WhatsApp) acts as a data processor for our WhatsApp Business integration. Message
            data is retained for a maximum of 30 days by WhatsApp. We retain messages only as long
            as necessary for providing our services and customer support.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Data Security</h2>
          <p className="text-gray-700 mb-6">
            We implement appropriate technical and organizational measures to protect your personal
            information against unauthorized access, alteration, disclosure, or destruction.
            WhatsApp messages are encrypted in transit and at rest.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Your Rights</h2>
          <p className="text-gray-700 mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>Access your personal information</li>
            <li>Correct inaccurate or incomplete data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
            <li>Withdraw consent at any time</li>
            <li>Data portability where applicable</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Consent and Opt-out</h2>
          <p className="text-gray-700 mb-6">
            By messaging us on WhatsApp, you consent to receive communications from us via WhatsApp
            for the purposes outlined in this policy. You can opt-out at any time by sending
            &ldquo;STOP&rdquo; or contacting us directly.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Data Retention</h2>
          <p className="text-gray-700 mb-6">
            We retain your personal information only as long as necessary for the purposes outlined
            in this policy or as required by law. WhatsApp message data is automatically deleted
            after 30 days unless retained for ongoing service provision.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Changes to This Policy</h2>
          <p className="text-gray-700 mb-6">
            We may update this Privacy Policy from time to time. We will notify you of any
            significant changes via WhatsApp or email.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
          <p className="text-gray-700 mb-4">
            If you have questions about this Privacy Policy or wish to exercise your rights, contact
            us:
          </p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-gray-700 mb-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@bridge-driving.com" className="text-blue-600 hover:underline">
                privacy@bridge-driving.com
              </a>
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Address:</strong> Bridge Driving School, [Your Address]
            </p>
            <p className="text-gray-700">
              <strong>Phone:</strong> [Your Phone Number]
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
