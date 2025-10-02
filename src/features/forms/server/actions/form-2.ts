'use server';

import { getClient } from '@/server/db/client';
import { fillAndFlattenPdf } from '@/features/forms/lib/pdf-server-utils';
import { getEnrollmentByPlanId } from '@/server/db/plan';
import { form2FieldNames } from '@/features/forms/lib/field-names/form-2';
import { LicenseClassEnum } from '@/db/schema';
import { getBranchConfigWithTenant } from '@/server/db/branch';
import { getTenantNameInitials } from '@/lib/utils';

export const fillForm2 = async (clientId: string) => {
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
    const base64Pdf = await fillAndFlattenPdf('form-2.pdf', (form) => {
      try {
        form
          .getTextField(form2FieldNames.licencing_authority_1)
          .setText((branchConfig?.defaultRtoOffice as string).toUpperCase());

        form.getCheckBox(form2FieldNames.issue_new_driving_licence).check();

        const licenseClasses = enrollment.client.learningLicense?.class;
        LicenseClassEnum.enumValues.forEach((vehicleClass) => {
          if (licenseClasses?.includes(vehicleClass)) {
            form.getCheckBox(form2FieldNames[vehicleClass]).check();
          }
        });

        // Personal details
        form.getTextField(form2FieldNames.aadhaar_card_number).setText(client.aadhaarNumber);
        form.getTextField(form2FieldNames.first_name).setText(client.firstName.toUpperCase());
        if (client.middleName)
          form.getTextField(form2FieldNames.middle_name).setText(client.middleName.toUpperCase());
        form.getTextField(form2FieldNames.last_name).setText(client.lastName.toUpperCase());

        form.getTextField(form2FieldNames.first_name).setText(client.firstName.toUpperCase());

        form.getTextField(form2FieldNames.first_name).setText(client.firstName.toUpperCase());

        const guardianFullName =
          `${client.guardianFirstName}${client.guardianMiddleName ? ' ' + client.guardianMiddleName : ''} ${client.guardianLastName}`.toUpperCase();

        form.getTextField(form2FieldNames.guardian_name).setText(guardianFullName);

        form.getTextField(form2FieldNames.date_of_birth_1).setText(client.birthDate);

        // Gender
        if (client.gender === 'MALE') {
          form.getCheckBox(form2FieldNames.gender_male).check();
        } else if (client.gender === 'FEMALE') {
          form.getCheckBox(form2FieldNames.gender_female).check();
        } else if (client.gender === 'OTHER') {
          form.getCheckBox(form2FieldNames.gender_transgender).check();
        }

        // Educational qualification
        form
          .getTextField(form2FieldNames.educational_qualification)
          .setText(client.educationalQualification.toUpperCase());

        form.getTextField(form2FieldNames.date_of_birth_2).setText(client.birthDate);

        // Blood group
        form.getTextField(form2FieldNames.blood_group).setText(client.bloodGroup.toUpperCase());

        // Contact details
        form.getTextField(form2FieldNames.mobile_number).setText(client.phoneNumber);

        if (client.email)
          form.getTextField(form2FieldNames.email).setText(client.email.toUpperCase());
        if (client.alternativePhoneNumber)
          form.getTextField(form2FieldNames.landline_number).setText(client.alternativePhoneNumber);

        if (client.guardianRelationship === 'GUARDIAN') {
          form.getCheckBox(form2FieldNames.relationship_guardian).check();
        } else if (client.guardianRelationship === 'FATHER') {
          form.getCheckBox(form2FieldNames.relationship_father).check();
        } else if (client.guardianRelationship === 'MOTHER') {
          form.getCheckBox(form2FieldNames.relationship_mother).check();
        } else if (client.guardianRelationship === 'HUSBAND') {
          form.getCheckBox(form2FieldNames.relationship_husband).check();
        }

        // Guardian details
        form
          .getTextField(form2FieldNames.guardian_first_name)
          .setText(client.guardianFirstName.toUpperCase());
        if (client.guardianMiddleName)
          form
            .getTextField(form2FieldNames.guardian_middle_name)
            .setText(client.guardianMiddleName.toUpperCase());
        form
          .getTextField(form2FieldNames.guardian_last_name)
          .setText(client.guardianLastName.toUpperCase());

        // Current address
        form.getTextField(form2FieldNames.current_house).setText(client.address.toUpperCase());
        form.getTextField(form2FieldNames.current_village).setText(client.city.toUpperCase());
        form.getTextField(form2FieldNames.current_state).setText(client.state.toUpperCase());
        form.getTextField(form2FieldNames.current_pincode).setText(client.pincode);

        form
          .getTextField(form2FieldNames.permanent_house)
          .setText(client.permanentAddress.toUpperCase());
        form
          .getTextField(form2FieldNames.permanent_village)
          .setText(client.permanentCity.toUpperCase());
        form
          .getTextField(form2FieldNames.permanent_state)
          .setText(client.permanentState.toUpperCase());
        form.getTextField(form2FieldNames.permanent_pincode).setText(client.permanentPincode);

        form
          .getTextField(form2FieldNames.driving_school_name)
          .setText(branchConfig.tenant.name.toUpperCase());
        form
          .getTextField(form2FieldNames.enrollment_number)
          .setText(
            (
              getTenantNameInitials(branchConfig.tenant.name) +
              '-' +
              enrollment.planCode
            ).toUpperCase()
          );
        form.getTextField(form2FieldNames.enrollment_date).setText(enrollment.joiningDate);
        form.getTextField(form2FieldNames.training_period_from).setText(enrollment.joiningDate);
        if (enrollment.completedAt)
          form.getTextField(form2FieldNames.training_period_to).setText(enrollment.completedAt);

        // Existing licence details (if applicable)
        if (learningLicense && learningLicense.licenseNumber) {
          form
            .getTextField(form2FieldNames.license_number)
            .setText(learningLicense.licenseNumber.toUpperCase());
          if (learningLicense.issueDate) {
            form
              .getTextField(form2FieldNames.validity_period_from)
              .setText(learningLicense.issueDate);
          }
          if (learningLicense.expiryDate) {
            form
              .getTextField(form2FieldNames.validity_period_to)
              .setText(learningLicense.expiryDate);
          }
        }

        form.getCheckBox(form2FieldNames.declaration_donate_organ_yes).check();

        form.getCheckBox(form2FieldNames.declaration_epilepsy_no).check();
        form.getCheckBox(form2FieldNames.declaration_eye_no).check();
        form.getCheckBox(form2FieldNames.declaration_limbs_no).check();
        form.getCheckBox(form2FieldNames.declaration_night_blindness_no).check();
        form.getCheckBox(form2FieldNames.declaration_deaf_no).check();
        form.getCheckBox(form2FieldNames.declaration_other_disability_no).check();

        form
          .getTextField(form2FieldNames.declaration_name)
          .setText((client.firstName + ' ' + client.lastName).toUpperCase());
        form.getTextField(form2FieldNames.declaration_guardian_name).setText(guardianFullName);
        form
          .getTextField(form2FieldNames.declaration_guardian_relationship)
          .setText(client.guardianRelationship.toUpperCase());
        form
          .getTextField(form2FieldNames.declaration_designation)
          .setText(client.guardianRelationship.toUpperCase());
      } catch {
        console.log('something went wrong');
      }
    });

    return {
      success: true,
      pdfData: base64Pdf,
      fileName: `${client.clientCode}-form-2.pdf`,
    };
  } catch (error) {
    console.error('Error filling PDF:', error);
    return {
      success: false,
      error: 'Failed to fill PDF',
    };
  }
};
