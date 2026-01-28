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

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-6">
            By accessing or using <strong>Bridge Driving School Services</strong>&apos; website, you
            agree to be bound by these Terms and Conditions. If you do not agree with any part of
            these Terms, you must not use the website.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. User Conduct</h2>
          <p className="text-gray-700 mb-6">
            You agree not to engage in any activity that disrupts, interferes with, or otherwise
            harms the functioning of the website, its services, or its associated infrastructure.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            3. Intellectual Property
          </h2>
          <p className="text-gray-700 mb-6">
            All content, materials, trademarks, logos, and intellectual property available on this
            website are the property of <strong>Bridge Driving School Services</strong> or its
            licensors and are protected by applicable intellectual property laws. Unauthorized use
            is strictly prohibited.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            4. Limitation of Liability
          </h2>
          <p className="text-gray-700 mb-6">
            To the fullest extent permitted by law, <strong>Bridge Driving School Services</strong>{' '}
            shall not be liable for any indirect, incidental, special, consequential, or punitive
            damages arising out of or related to your access to or use of the website.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Indemnification</h2>
          <p className="text-gray-700 mb-6">
            You agree to indemnify, defend, and hold harmless{' '}
            <strong>Bridge Driving School Services</strong>, its directors, employees, and
            affiliates from any claims, losses, liabilities, damages, costs, or expenses arising out
            of or relating to your use of the website or violation of these Terms.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            6. Governing Law and Jurisdiction
          </h2>
          <p className="text-gray-700 mb-6">
            These Terms and Conditions shall be governed by and construed in accordance with the
            laws of <strong>India</strong>. Any disputes arising out of or in connection with these
            Terms shall be subject to the{' '}
            <strong>
              exclusive jurisdiction of the courts located in Navi Mumbai, Maharashtra, India
            </strong>
            .
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Changes to Terms</h2>
          <p className="text-gray-700 mb-6">
            We may update these Terms and Conditions from time to time. Continued use of our
            services constitutes acceptance of the updated terms.
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
