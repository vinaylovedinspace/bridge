CREATE TYPE "public"."digilocker_flow_preference" AS ENUM('manager', 'client');--> statement-breakpoint
CREATE TYPE "public"."license_classes" AS ENUM('MCWOG', 'MCWG', 'LMV', 'ADAPTED_VEHICLE', 'TRANSPORT_VEHICLE', 'E_RICKSHAW', 'E_CART', 'OTHERS');--> statement-breakpoint
CREATE TYPE "public"."vehicle_document_types" AS ENUM('PUC', 'INSURANCE', 'REGISTRATION');--> statement-breakpoint
CREATE TYPE "public"."blood_group" AS ENUM('A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-');--> statement-breakpoint
CREATE TYPE "public"."citizen_status" AS ENUM('BIRTH', 'NATURALIZED', 'CITIZEN', 'DESCENT', 'REGISTRATION');--> statement-breakpoint
CREATE TYPE "public"."educational_qualification" AS ENUM('BELOW_10TH', 'CLASS_10TH', 'CLASS_12TH', 'GRADUATE', 'POST_GRADUATE', 'OTHERS');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."guardian_relationship" AS ENUM('FATHER', 'MOTHER', 'HUSBAND', 'GUARDIAN');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('NOT_STARTED', 'WAITING_FOR_LL_TEST', 'IN_PROGRESS', 'WAITING_FOR_DL_TEST', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('FULL_SERVICE', 'DRIVING_ONLY');--> statement-breakpoint
CREATE TYPE "public"."client_document_types" AS ENUM('AADHAAR_CARD', 'PAN_CARD');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PARTIALLY_PAID', 'FULLY_PAID', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('FULL_PAYMENT', 'INSTALLMENTS');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('QR', 'CASH');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');--> statement-breakpoint
CREATE TYPE "public"."clerk_roles" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."staff_roles" AS ENUM('instructor', 'manager', 'accountant');--> statement-breakpoint
CREATE TYPE "public"."rto_service_priority" AS ENUM('NORMAL', 'TATKAL');--> statement-breakpoint
CREATE TYPE "public"."rto_service_status" AS ENUM('PENDING', 'DOCUMENT_COLLECTION', 'APPLICATION_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."rto_service_type" AS ENUM('NEW_DRIVING_LICENCE', 'ADDITION_OF_CLASS', 'LICENSE_RENEWAL', 'DUPLICATE_LICENSE', 'NAME_CHANGE', 'ADDRESS_CHANGE', 'INTERNATIONAL_PERMIT');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('CLIENT', 'PAYMENT', 'VEHICLE', 'SESSION', 'RTO_SERVICE', 'LICENSE');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('PAYMENT_RECEIVED', 'INSTALLMENT_DUE', 'INSTALLMENT_OVERDUE', 'PAY_LATER_REMINDER', 'REFUND_PROCESSED', 'LEARNING_TEST_TODAY', 'ELIGIBLE_FOR_DRIVING_TEST', 'LICENSE_ISSUED', 'LICENSE_RENEWAL_DUE', 'VEHICLE_DOCUMENT_EXPIRING', 'VEHICLE_DOCUMENT_EXPIRED', 'VEHICLE_MAINTENANCE_DUE', 'SESSION_TODAY', 'SESSION_CANCELLED', 'SESSION_RESCHEDULED', 'RTO_STATUS_UPDATED', 'RTO_SERVICE_COMPLETED', 'RTO_TATKAL_DEADLINE', 'NEW_CLIENT_ADMISSION', 'REPORT_READY', 'LOW_CAPACITY_WARNING');--> statement-breakpoint
CREATE TYPE "public"."digilocker_status" AS ENUM('PENDING', 'AUTHORIZED', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"number" text NOT NULL,
	"rent" integer NOT NULL,
	"puc_expiry" text,
	"insurance_expiry" text,
	"registration_expiry" text,
	"branch_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"whatsapp_number" text,
	"licence_number" text,
	"address" text,
	"license_issue_date" text,
	"merchant_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"org_id" text NOT NULL,
	"working_days" json DEFAULT '[0,1,2,3,4,5,6]'::json NOT NULL,
	"operating_hours" json DEFAULT '{"start":"06:00","end":"20:00"}'::json NOT NULL,
	"license_service_charge" integer DEFAULT 500 NOT NULL,
	"default_rto_office" text,
	"digilocker_flow_preference" "digilocker_flow_preference" DEFAULT 'manager' NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "branches_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "vehicle_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"name" text,
	"type" "vehicle_document_types",
	"vehicle_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"client_code" text NOT NULL,
	"aadhaar_number" text NOT NULL,
	"photo_url" text,
	"signature_url" text,
	"guardian_first_name" text NOT NULL,
	"guardian_middle_name" text,
	"guardian_last_name" text NOT NULL,
	"guardianRelationship" "guardian_relationship" DEFAULT 'GUARDIAN' NOT NULL,
	"birth_date" text NOT NULL,
	"bloodGroup" "blood_group" NOT NULL,
	"gender" "gender" NOT NULL,
	"educationalQualification" "educational_qualification" DEFAULT 'CLASS_12TH' NOT NULL,
	"phone_number" text NOT NULL,
	"alternative_phone_number" text,
	"email" text,
	"address_line_1" text NOT NULL,
	"address_line_2" text NOT NULL,
	"address_line_3" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text NOT NULL,
	"is_current_address_same_as_permanent_address" boolean DEFAULT false,
	"permanent_address_line_1" text NOT NULL,
	"permanent_address_line_2" text NOT NULL,
	"permanent_address_line_3" text,
	"permanent_city" text NOT NULL,
	"permanent_state" text NOT NULL,
	"permanent_pincode" text NOT NULL,
	"citizenStatus" "citizen_status" DEFAULT 'BIRTH',
	"branch_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "phone_number_tenant_unique" UNIQUE("phone_number","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_code" text NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"number_of_sessions" integer NOT NULL,
	"session_duration_in_minutes" integer NOT NULL,
	"joining_date" text NOT NULL,
	"joining_time" time NOT NULL,
	"vehicle_rent_amount" integer NOT NULL,
	"serviceType" "service_type" NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "status" DEFAULT 'NOT_STARTED' NOT NULL,
	"completed_at" text,
	"payment_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "plans_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "driving_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class" "license_classes"[],
	"appointment_date" text,
	"license_number" text,
	"issue_date" text,
	"expiry_date" text,
	"application_number" text,
	"test_conducted_by" text,
	"imv" text,
	"rto" text,
	"department" text,
	"client_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "driving_licenses_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "learning_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class" "license_classes"[],
	"test_conducted_on" text,
	"license_number" text,
	"issue_date" text,
	"expiry_date" text,
	"application_number" text,
	"exclude_learning_license_fee" boolean DEFAULT false NOT NULL,
	"client_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "learning_licenses_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "client_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"name" text,
	"type" "client_document_types",
	"client_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "full_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"payment_date" text,
	"payment_mode" "payment_mode",
	"is_paid" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "full_payments_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "installment_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"amount" integer NOT NULL,
	"payment_mode" "payment_mode",
	"payment_date" text,
	"is_paid" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"license_service_fee" integer DEFAULT 0 NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"payment_type" "payment_type" DEFAULT 'FULL_PAYMENT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"payment_mode" "payment_mode" NOT NULL,
	"payment_gateway" text,
	"transaction_status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"transaction_reference" text,
	"notes" text,
	"txn_date" timestamp,
	"installment_number" integer,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"session_date" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"status" "session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"session_number" integer NOT NULL,
	"original_session_id" uuid,
	"branch_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "form_prints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"form_type" varchar(50) NOT NULL,
	"printed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"printed_by" varchar(255) NOT NULL,
	"batch_id" uuid,
	"branch_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"photo" text,
	"staff_role" "staff_roles" NOT NULL,
	"clerk_role" "clerk_roles" NOT NULL,
	"assigned_vehicle_id" uuid,
	"license_number" text,
	"license_issue_date" timestamp,
	"experience_years" text,
	"education_level" text,
	"phone" text,
	"branch_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rto_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"serviceType" "rto_service_type" NOT NULL,
	"status" "rto_service_status" DEFAULT 'PENDING' NOT NULL,
	"application_number" text,
	"government_fees" integer NOT NULL,
	"service_charge" integer NOT NULL,
	"application_date" timestamp DEFAULT now() NOT NULL,
	"expected_completion_date" timestamp,
	"actual_completion_date" timestamp,
	"remarks" text,
	"required_documents" text,
	"submitted_documents" text,
	"tracking_number" text,
	"agent_assigned" text,
	"is_document_collection_complete" boolean DEFAULT false,
	"is_payment_complete" boolean DEFAULT false,
	"requires_client_presence" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "rto_services_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"entity_type" "entity_type",
	"entity_id" integer,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"expense_date" timestamp NOT NULL,
	"staff_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "digilocker_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"status" "digilocker_status" DEFAULT 'PENDING' NOT NULL,
	"aadhaar_data" jsonb,
	"parsed_data" jsonb,
	"aadhaar_pdf_url" text,
	"error_message" text,
	"tenant_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE INDEX "idx_clients_branch_created" ON "clients" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_clients_phone_tenant" ON "clients" USING btree ("phone_number","tenant_id");--> statement-breakpoint
CREATE INDEX "idx_plans_client_service" ON "plans" USING btree ("client_id","serviceType","branch_id");--> statement-breakpoint
CREATE INDEX "idx_plans_payment_branch" ON "plans" USING btree ("payment_id","branch_id","joining_date");--> statement-breakpoint
CREATE INDEX "idx_learning_license_client" ON "learning_licenses" USING btree ("client_id","issue_date");--> statement-breakpoint
CREATE INDEX "idx_full_payments_payment_paid" ON "full_payments" USING btree ("payment_id","is_paid");--> statement-breakpoint
CREATE INDEX "idx_installment_payments_unique" ON "installment_payments" USING btree ("payment_id","installment_number");--> statement-breakpoint
CREATE INDEX "idx_installment_payments_payment_number" ON "installment_payments" USING btree ("payment_id","installment_number","is_paid");--> statement-breakpoint
CREATE INDEX "idx_payments_client_status" ON "payments" USING btree ("client_id","payment_status","payment_type");--> statement-breakpoint
CREATE INDEX "idx_sessions_date_status_vehicle" ON "sessions" USING btree ("session_date","status","vehicle_id");--> statement-breakpoint
CREATE INDEX "idx_staff_branch_role_deleted" ON "staff" USING btree ("branch_id","staff_role","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_rto_services_branch_status" ON "rto_services" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "idx_rto_services_payment" ON "rto_services" USING btree ("payment_id","branch_id");