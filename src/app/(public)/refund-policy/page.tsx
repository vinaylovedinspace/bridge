import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy | Bridge Driving School',
  description: 'Refund policy for Bridge Driving School services',
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Refund Policy</h1>

        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            This Refund Policy outlines the terms and conditions regarding refunds for services
            provided by Bridge Driving School.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">No Refund Policy</h2>
          <p className="text-gray-700 mb-6">
            <strong>All sales are final.</strong> Bridge Driving School does not offer refunds for
            any services, courses, or fees paid. Once payment has been made and services have been
            enrolled, no refunds will be issued under any circumstances.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            Understanding This Policy
          </h2>
          <p className="text-gray-700 mb-6">
            By enrolling in our driving school services and making payment, you acknowledge and
            agree that:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>All fees paid are non-refundable</li>
            <li>Services cannot be cancelled for a refund once payment is processed</li>
            <li>No partial refunds will be issued for unused services or lessons</li>
            <li>Payment plans and installments are also subject to this no-refund policy</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Service Modifications</h2>
          <p className="text-gray-700 mb-6">
            While we do not offer refunds, we may offer service modifications or rescheduling in
            certain circumstances at our sole discretion. This includes:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>Rescheduling of lessons due to emergencies or unforeseen circumstances</li>
            <li>Transfer of services to another eligible student (subject to approval)</li>
            <li>Extension of service validity period in exceptional cases</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Questions and Concerns</h2>
          <p className="text-gray-700 mb-6">
            If you have questions about this Refund Policy or wish to discuss your specific
            situation, please contact us before making any payment. We encourage all prospective
            students to carefully review our services and policies before enrollment.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Information</h2>
          <p className="text-gray-700 mb-4">
            For questions regarding this Refund Policy, please contact us:
          </p>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-gray-700 mb-2">
              <strong>Email:</strong>{' '}
              <a
                href="mailto:support@welovedinspace.studio"
                className="text-blue-600 hover:underline"
              >
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
