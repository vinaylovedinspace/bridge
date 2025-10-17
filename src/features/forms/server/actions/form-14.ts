'use server';

import { getClient } from '@/server/db/client';
import { fillAndFlattenPdf } from '@/features/forms/lib/pdf-server-utils';
import { getEnrollmentByPlanId } from '@/server/db/plan';
import { form14FieldNames } from '@/features/forms/lib/field-names/form-14';
import { getBranchConfigWithTenant } from '@/server/db/branch';
import { formatDateToDDMMYYYY, getTenantNameInitials } from '@/lib/utils';
import fs from 'fs';
import path from 'path';

export const fillForm14 = async (clientId: string) => {
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
    const drivingLicense = client.drivingLicense;

    const pdfPath = path.join(process.cwd(), 'src', 'assets', 'pdfs', 'form-14.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);

    // Fill the PDF form
    const base64Pdf = await fillAndFlattenPdf(pdfBytes, (form) => {
      try {
        // Get current year for registration
        const currentYear = new Date().getFullYear().toString();
        form.getTextField(form14FieldNames.register_for_the_year).setText(currentYear);

        // Enrollment details
        form
          .getTextField(form14FieldNames.enrollment_number)
          .setText(getTenantNameInitials(branchConfig.tenant.name) + '-' + enrollment.planCode);

        // Personal details
        const fullName = `${client.firstName}${client.middleName ? ' ' + client.middleName : ''} ${client.lastName}`;
        form.getTextField(form14FieldNames.trainee_name).setText(fullName);

        // License class
        if (learningLicense?.class) {
          form
            .getTextField(form14FieldNames.licence_class)
            .setText(learningLicense.class.join(', '));
        }

        const guardianFullName = `${client.guardianFirstName}${client.guardianMiddleName ? ' ' + client.guardianMiddleName : ''} ${client.guardianLastName}`;
        form.getTextField(form14FieldNames.guardian_name).setText(guardianFullName);

        form.getTextField(form14FieldNames.date_of_birth).setText(client.birthDate);

        // Addresses
        const permanentAddress = `${client.permanentAddressLine1}, ${client.permanentPincode}`;
        form.getTextField(form14FieldNames.permanent_address).setText(permanentAddress);

        const temporaryAddress = `${client.addressLine1}, ${client.pincode}`;
        form.getTextField(form14FieldNames.temporary_address).setText(temporaryAddress);

        // Enrollment date
        form
          .getTextField(form14FieldNames.date_of_enrollment)
          .setText(formatDateToDDMMYYYY(enrollment.joiningDate));

        // Learning license details
        if (learningLicense) {
          let llDetails = learningLicense.licenseNumber || '';
          if (learningLicense.expiryDate) {
            llDetails += ` (${formatDateToDDMMYYYY(learningLicense.expiryDate)})`;
          }
          form
            .getTextField(form14FieldNames.learners_licence_number_and_issue_date)
            .setText(llDetails);
        }

        // Driving license details
        if (drivingLicense) {
          let dlDetails = drivingLicense.licenseNumber || '';
          if (drivingLicense.issueDate) {
            dlDetails += ` (${drivingLicense.issueDate})`;
          }
          form
            .getTextField(form14FieldNames.driving_licence_number_and_issue_date)
            .setText(dlDetails);

          if (drivingLicense.issueDate) {
            form
              .getTextField(form14FieldNames.driving_licence_test_passing_date)
              .setText(drivingLicense.issueDate);
          }
        }

        // Course completion date
        if (enrollment.completedAt) {
          form
            .getTextField(form14FieldNames.date_of_completion_of_course)
            .setText(enrollment.completedAt);
        }
      } catch (error) {
        console.log('Error filling form-14:', error);
      }
    });

    return {
      success: true,
      pdfData: base64Pdf,
      fileName: `${client.clientCode}-form-14.pdf`,
    };
  } catch (error) {
    console.error('Error filling PDF:', error);
    return {
      success: false,
      error: 'Failed to fill PDF',
    };
  }
};
