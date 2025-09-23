import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Request | Bridge Driving School',
  description: 'Request deletion of your personal data from our WhatsApp integration',
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Data Deletion Request</h1>

        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            We respect your privacy and your right to control your personal data. If you wish to
            request the deletion of your personal information from our WhatsApp Business
            integration, please use the process outlined below.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">What Data We Collect</h2>
          <p className="text-gray-700 mb-4">
            Through our WhatsApp Business integration, we may collect:
          </p>
          <ul className="list-disc pl-6 text-gray-700 mb-6">
            <li>Phone number</li>
            <li>WhatsApp profile name</li>
            <li>Message content you send to us</li>
            <li>Message timestamps</li>
            <li>Delivery and read receipts</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Data Retention</h2>
          <p className="text-gray-700 mb-6">
            We retain your WhatsApp data only as long as necessary for legitimate business purposes,
            including providing customer support and managing your driving school enrollment.
            Message data is automatically deleted after 30 days unless required for ongoing service
            provision.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">
            How to Request Data Deletion
          </h2>
          <p className="text-gray-700 mb-4">
            To request deletion of your personal data from our WhatsApp integration, please:
          </p>
          <ol className="list-decimal pl-6 text-gray-700 mb-6">
            <li>
              Send an email to{' '}
              <a
                href="mailto:support@welovedinspace.studio"
                className="text-blue-600 hover:underline"
              >
                support@welovedinspace.studio
              </a>
            </li>
            <li>Include &ldquo;WhatsApp Data Deletion Request&rdquo; in the subject line</li>
            <li>Provide your phone number associated with the WhatsApp account</li>
            <li>Include any additional identifying information to help us locate your data</li>
          </ol>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Processing Your Request</h2>
          <p className="text-gray-700 mb-6">
            We will process your data deletion request within 30 days of receipt. You will receive a
            confirmation email once your data has been deleted from our systems. Please note that
            some data may be retained if required by law or for legitimate business purposes such as
            record-keeping obligations.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Information</h2>
          <p className="text-gray-700 mb-4">
            If you have any questions about this data deletion process or our privacy practices,
            please contact us:
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
