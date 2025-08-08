'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Eye, Printer, Users, UserCheck } from 'lucide-react';
import { ClientSelector } from './client-selector';
import { FormPreview } from './form-preview';
import { EligibleStudentsSection } from './eligible-students-section';
import { getClientForForm } from '@/server/actions/forms';
import { generateSinglePDF, type FormData } from '@/lib/pdf-generator';
import { toast } from 'sonner';
import { useQueryState } from 'nuqs';

interface RtoForm {
  id: string;
  title: string;
  description: string;
  formNumber: string;
  category: 'primary' | 'additional';
  requiredData: string[];
}

const RTO_FORMS: RtoForm[] = [
  {
    id: 'form-1',
    title: 'Application-cum-Declaration: Physical Fitness',
    description: 'Used along with Form 2 when applying for a new learners licence',
    formNumber: 'Form 1',
    category: 'primary',
    requiredData: ['Personal Info', 'Medical Details', 'Guardian Info'],
  },
  {
    id: 'form-1a',
    title: 'Medical Certificate',
    description:
      'Required for applicants aged 40+, or those applying for commercial (transport) licences',
    formNumber: 'Form 1A',
    category: 'primary',
    requiredData: ['Personal Info', 'Medical Details', 'Age Verification'],
  },
  {
    id: 'form-2',
    title: 'Application for Learners Licence',
    description:
      'Covers new learners licence, permanent licence, addition of vehicle class, renewal, duplicate licence, and change/correction of DL',
    formNumber: 'Form 2',
    category: 'primary',
    requiredData: ['Personal Info', 'Address', 'Guardian Info', 'License Class'],
  },
  {
    id: 'form-4',
    title: 'Application for Permanent Driving Licence',
    description:
      'Submitted once the learners licence is held for 30 days; accompanied by documents, photos, etc.',
    formNumber: 'Form 4',
    category: 'primary',
    requiredData: ['Personal Info', 'Learning License', 'Address', 'Photos'],
  },
  {
    id: 'form-5',
    title: 'Driving School Certificate',
    description: 'Issued by certified driving schools, mandatory for transport licence applicants',
    formNumber: 'Form 5',
    category: 'primary',
    requiredData: ['Personal Info', 'School Details', 'Training Records'],
  },
  {
    id: 'form-5b',
    title: 'ADTC Certificate (Maharashtra)',
    description:
      'Certificate from Accredited Driver Training Centre (ADTC) - exempts from driving test',
    formNumber: 'Form 5B',
    category: 'primary',
    requiredData: ['Personal Info', 'ADTC Details', 'Training Records', 'Assessment'],
  },
  {
    id: 'form-8',
    title: 'Application for Adding a New Class of Vehicle',
    description: 'Used if you already hold a licence and want to add another vehicle category',
    formNumber: 'Form 8',
    category: 'additional',
    requiredData: ['Personal Info', 'Existing License', 'New Vehicle Class'],
  },
  {
    id: 'form-9',
    title: 'Application for Driving Licence Renewal',
    description: 'Submitted when renewing an existing DL — includes medical certificate as needed',
    formNumber: 'Form 9',
    category: 'additional',
    requiredData: ['Personal Info', 'Existing License', 'Medical Certificate'],
  },
  {
    id: 'form-lld',
    title: 'Application for Duplicate Driving Licence',
    description: 'For lost, damaged, or stolen licences; police FIR may also be required',
    formNumber: 'Form LLD',
    category: 'additional',
    requiredData: ['Personal Info', 'License Details', 'Police Report'],
  },
  {
    id: 'form-4a',
    title: 'Application for International Driving Permit (IDP)',
    description:
      'Required along with your valid DL, Medical Certificate, passport & visa copies, photos & applicable fees',
    formNumber: 'Form 4A',
    category: 'additional',
    requiredData: ['Personal Info', 'Driving License', 'Passport', 'Medical Certificate'],
  },
];

export function FormsPage() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<RtoForm | null>(null);
  const [activeTab, setActiveTab] = useQueryState('tab', {
    defaultValue: 'individual' as 'individual' | 'bulk',
    parse: (value: string) => value as 'individual' | 'bulk',
  });
  const [downloadingForm, setDownloadingForm] = useState<string | null>(null);
  const primaryForms = RTO_FORMS.filter((form) => form.category === 'primary');
  const additionalForms = RTO_FORMS.filter((form) => form.category === 'additional');

  const handlePreviewForm = (form: RtoForm) => {
    if (!selectedClient) {
      alert('Please select a client first');
      return;
    }
    setSelectedForm(form);
  };

  const handleDownloadForm = async (form: RtoForm) => {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }

    if (form.id !== 'form-4') {
      toast.info('PDF generation currently only supports Form 4');
      return;
    }

    setDownloadingForm(form.id);
    try {
      toast.info('Generating PDF...');

      // Fetch client data
      const clientData = await getClientForForm(selectedClient);
      if (!clientData) {
        toast.error('Client data not found');
        return;
      }

      // Convert to FormData format
      const formData: FormData = {
        id: clientData.id,
        firstName: clientData.firstName,
        middleName: clientData.middleName,
        lastName: clientData.lastName,
        clientCode: clientData.clientCode,
        phoneNumber: clientData.phoneNumber,
        email: clientData.email,
        aadhaarNumber: clientData.aadhaarNumber,
        panNumber: clientData.panNumber,
        birthDate: clientData.birthDate,
        bloodGroup: clientData.bloodGroup,
        gender: clientData.gender,
        address: clientData.address,
        city: clientData.city,
        state: clientData.state,
        pincode: clientData.pincode,
        guardianFirstName: clientData.guardianFirstName,
        guardianMiddleName: clientData.guardianMiddleName,
        guardianLastName: clientData.guardianLastName,
        photoUrl: clientData.photoUrl,
        signatureUrl: clientData.signatureUrl,
        learningLicenseNumber: clientData.learningLicense?.licenseNumber,
        learningLicenseIssueDate: clientData.learningLicense?.issueDate,
        learningLicenseExpiryDate: clientData.learningLicense?.expiryDate,
        learningLicenseClass: clientData.learningLicense?.class,
      };

      // Generate PDF
      await generateSinglePDF(formData, `${form.formNumber}_${clientData.clientCode}`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingForm(null);
    }
  };

  const handlePrintForm = (form: RtoForm) => {
    if (!selectedClient) {
      alert('Please select a client first');
      return;
    }
    // Open the form in preview mode and trigger print
    setSelectedForm(form);
    // Print will be triggered from the preview modal
  };

  const FormCard = ({ form }: { form: RtoForm }) => (
    <Card className="group hover:shadow-md transition-shadow justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <Badge variant="outline" className="text-xs">
              {form.formNumber}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-base leading-tight">{form.title}</CardTitle>
        <CardDescription className="text-xs line-clamp-2">{form.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {form.requiredData.slice(0, 3).map((data) => (
              <Badge key={data} variant="secondary" className="text-xs px-2 py-0.5">
                {data}
              </Badge>
            ))}
            {form.requiredData.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                +{form.requiredData.length - 3}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePreviewForm(form)}
              disabled={!selectedClient}
              className="flex-1 text-xs h-8"
            >
              <Eye className="h-2 w-2 mr-1" />
              Preview
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePrintForm(form)}
              disabled={!selectedClient}
              className="flex-1 text-xs h-8"
            >
              <Printer className="h-2 w-2 mr-1" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={() => handleDownloadForm(form)}
              disabled={!selectedClient || downloadingForm === form.id}
              className="flex-1 text-xs h-8"
            >
              <Download className="h-2 w-2 mr-1" />
              {downloadingForm === form.id ? 'Generating...' : 'Download'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">RTO Forms</h1>
          <p className="text-muted-foreground text-sm">
            Generate pre-filled RTO forms using client data from onboarding
          </p>
        </div>

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'individual' | 'bulk')}
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Individual Forms
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bulk Downloads
            </TabsTrigger>
          </TabsList>

          {/* Individual Forms Tab */}
          <TabsContent value="individual" className="space-y-6">
            {/* Client Selection */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3">Select Client</h3>
              <ClientSelector selectedClient={selectedClient} onClientSelect={setSelectedClient} />
            </div>

            {/* Forms Grid */}
            <div className="space-y-6">
              {/* Primary Forms */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Primary Forms</h3>
                  <Badge variant="secondary">{primaryForms.length} forms</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {primaryForms.map((form) => (
                    <FormCard key={form.id} form={form} />
                  ))}
                </div>
              </div>

              {/* Additional Forms */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Additional Forms</h3>
                  <Badge variant="secondary">{additionalForms.length} forms</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {additionalForms.map((form) => (
                    <FormCard key={form.id} form={form} />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Bulk Downloads Tab */}
          <TabsContent value="bulk" className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Bulk Form Downloads</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Download forms for multiple eligible students at once. Perfect for batch processing
                RTO submissions.
              </p>
              <EligibleStudentsSection />
            </div>
          </TabsContent>
        </Tabs>

        {/* Form Preview Modal */}
        {selectedForm && selectedClient && (
          <FormPreview
            form={selectedForm}
            clientId={selectedClient}
            onClose={() => setSelectedForm(null)}
          />
        )}
      </div>
    </div>
  );
}
