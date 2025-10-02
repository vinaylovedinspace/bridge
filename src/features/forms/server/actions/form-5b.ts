'use server';

import { getClient } from '@/server/db/client';
import { fillAndFlattenPdf } from '@/features/forms/lib/pdf-server-utils';
import { getEnrollmentByPlanId } from '@/server/db/plan';
import { form5bFieldNames } from '@/features/forms/lib/field-names/form-5b';
import { getBranchConfigWithTenant } from '@/server/db/branch';
import { formatDateToDDMMYYYY, getTenantNameInitials } from '@/lib/utils';

export const fillForm5b = async (clientId: string) => {
  try {
    // Fetch client data
    const _client = await getClient(clientId);

    if (!_client) {
      throw new Error('Client not found');
    }

    const latestPlan = _client.plan[0];

    if (!latestPlan) {
      throw new Error('Plan not found');
    }

    const enrollment = await getEnrollmentByPlanId(latestPlan.id);

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const branchConfig = await getBranchConfigWithTenant();

    const client = enrollment.client;
    const learningLicense = client.learningLicense;

    // Fill the PDF form
    const base64Pdf = await fillAndFlattenPdf('form-5b.pdf', (form) => {
      try {
        // Personal details
        const fullName = `${client.firstName}${client.middleName ? ' ' + client.middleName : ''} ${client.lastName}`;
        form.getTextField(form5bFieldNames.name).setText(fullName);

        const guardianFullName = `${client.guardianFirstName}${client.guardianMiddleName ? ' ' + client.guardianMiddleName : ''} ${client.guardianLastName}`;
        form.getTextField(form5bFieldNames.guardian_name).setText(guardianFullName);

        // Address
        const fullAddress = `${client.addressLine1}`;
        form.getTextField(form5bFieldNames.address).setText(fullAddress);

        // Aadhaar number
        form.getTextField(form5bFieldNames.aadhaar_number).setText(client.aadhaarNumber);

        // Client code
        form
          .getTextField(form5bFieldNames.client_code)
          .setText(getTenantNameInitials(branchConfig.tenant.name) + '-' + enrollment.planCode);

        // Training dates
        form
          .getTextField(form5bFieldNames.enrollment_date)
          .setText(formatDateToDDMMYYYY(enrollment.joiningDate));
        form
          .getTextField(form5bFieldNames.start_date)
          .setText(formatDateToDDMMYYYY(enrollment.joiningDate));
        if (enrollment.completedAt) {
          form
            .getTextField(form5bFieldNames.end_date)
            .setText(formatDateToDDMMYYYY(enrollment.completedAt));
        }

        // License classes
        if (learningLicense?.class && learningLicense.class.length > 0) {
          form
            .getTextField(form5bFieldNames.licence_class_1)
            .setText(learningLicense.class[0] || '');
          if (learningLicense.class.length > 1) {
            form
              .getTextField(form5bFieldNames.licence_class_2)
              .setText(learningLicense.class[1] || '');
          }
          if (learningLicense.class.length > 2) {
            form
              .getTextField(form5bFieldNames.license_class_3)
              .setText(learningLicense.class[2] || '');
          }
        }

        // School details
        const schoolDetails = `${branchConfig.tenant.name}\nAddress:${branchConfig.tenant.address ?? ''}\nLicense:${branchConfig.tenant.licenceNumber ?? ''}\nIssue Date:${branchConfig.tenant.licenseIssueDate ?? ''}`;
        form
          .getTextField(form5bFieldNames.school_name_address_license_number)
          .setText(schoolDetails);
      } catch (error) {
        console.log('Error filling form-5b:', error);
      }
    });

    return {
      success: true,
      pdfData: base64Pdf,
      fileName: `${client.clientCode}-form-5b.pdf`,
    };
  } catch (error) {
    console.error('Error filling PDF:', error);
    return {
      success: false,
      error: 'Failed to fill PDF',
    };
  }
};
