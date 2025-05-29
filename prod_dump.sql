

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."generate_job_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Get next value from sequence and pad with zeros
  NEW.number := LPAD(nextval('job_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_job_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_inspections_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_job_inspections_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_replacements_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_job_replacements_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "show_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "timestamp" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "phone" "text",
    "address" "text",
    "zip" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuration" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."configuration" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_clock_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    CONSTRAINT "job_clock_events_type_check" CHECK (("event_type" = ANY (ARRAY['clock_in'::"text", 'clock_out'::"text", 'break_start'::"text", 'break_end'::"text"])))
);


ALTER TABLE "public"."job_clock_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_deficiencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_deficiencies_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "job_deficiencies_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."job_deficiencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_inspections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "model_number" "text",
    "serial_number" "text",
    "age" integer,
    "tonnage" "text",
    "unit_type" "text",
    "system_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed" boolean DEFAULT false,
    CONSTRAINT "job_inspections_system_type_check" CHECK (("system_type" = ANY (ARRAY['RTU'::"text", 'Split System'::"text"]))),
    CONSTRAINT "job_inspections_unit_type_check" CHECK (("unit_type" = ANY (ARRAY['Gas'::"text", 'Electric'::"text"])))
);


ALTER TABLE "public"."job_inspections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "issued_date" "date",
    "due_date" "date",
    "paid_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'issued'::"text", 'paid'::"text", 'void'::"text"])))
);


ALTER TABLE "public"."job_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_item_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "service_line" "text" NOT NULL,
    "unit_cost" numeric(10,2) NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_item_prices_type_check" CHECK (("type" = ANY (ARRAY['part'::"text", 'labor'::"text", 'item'::"text"])))
);


ALTER TABLE "public"."job_item_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "service_line" "text",
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_cost" numeric(10,2) NOT NULL,
    "total_cost" numeric(10,2) NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_items_type_check" CHECK (("type" = ANY (ARRAY['part'::"text", 'labor'::"text", 'item'::"text"])))
);


ALTER TABLE "public"."job_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_labor_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "service_line" "text" NOT NULL,
    "unit_cost" numeric(10,2) NOT NULL,
    "skill_level" "text",
    "is_overtime" boolean DEFAULT false,
    "is_emergency" boolean DEFAULT false,
    "duration_hours" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_labor_prices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."job_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."job_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_part_prices" (
    "code" character varying NOT NULL,
    "description" "text",
    "parts_cost" numeric(10,2),
    "estimated_hours" numeric(8,2),
    "complexity_multiplier" numeric(8,2),
    "adjusted_labor_cost" numeric(10,2),
    "truck_fee" numeric(10,2),
    "roof_access_fee" numeric(10,2),
    "total_base_cost" numeric(10,2),
    "flat_rate_non_contract" numeric(10,2),
    "flat_rate_pm_contract" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_part_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "data" "jsonb" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_replacements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "needs_crane" boolean DEFAULT false,
    "phase1" "jsonb" DEFAULT '{"cost": 0, "description": "Economy Option"}'::"jsonb",
    "phase2" "jsonb" DEFAULT '{"cost": 0, "description": "Standard Option"}'::"jsonb",
    "phase3" "jsonb" DEFAULT '{"cost": 0, "description": "Premium Option"}'::"jsonb",
    "labor" numeric(10,2) DEFAULT 0,
    "refrigeration_recovery" numeric(10,2) DEFAULT 0,
    "start_up_costs" numeric(10,2) DEFAULT 0,
    "accessories" "jsonb" DEFAULT '[]'::"jsonb",
    "thermostat_startup" numeric(10,2) DEFAULT 0,
    "removal_cost" numeric(10,2) DEFAULT 0,
    "warranty" "text",
    "additional_items" "jsonb" DEFAULT '[]'::"jsonb",
    "permit_cost" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "selected_phase" "text",
    "total_cost" numeric(10,2),
    CONSTRAINT "job_replacements_selected_phase_check" CHECK (("selected_phase" = ANY (ARRAY['phase1'::"text", 'phase2'::"text", 'phase3'::"text"])))
);


ALTER TABLE "public"."job_replacements" OWNER TO "postgres";


COMMENT ON COLUMN "public"."job_replacements"."selected_phase" IS 'Stores which phase option is currently selected (phase1, phase2, or phase3)';



COMMENT ON COLUMN "public"."job_replacements"."total_cost" IS 'Stores the calculated total cost including margin';



CREATE TABLE IF NOT EXISTS "public"."job_technicians" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "technician_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_technicians" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "number" "text" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'unscheduled'::"text" NOT NULL,
    "type" "text" NOT NULL,
    "owner_id" "uuid",
    "contact_name" "text",
    "contact_phone" "text",
    "location_id" "uuid",
    "contract_id" "uuid",
    "contract_name" "text",
    "office" "text",
    "is_training" boolean DEFAULT false,
    "time_period_start" "date" NOT NULL,
    "time_period_due" "date" NOT NULL,
    "schedule_start" timestamp with time zone,
    "schedule_duration" interval,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "contact_email" "text",
    "contact_type" "text",
    "service_line" "text",
    "description" "text",
    "problem_description" "text",
    "customer_po" "text",
    "service_contract" "text" DEFAULT 'Standard'::"text",
    "schedule_date" "date",
    "schedule_time" time without time zone,
    "unit_id" "uuid",
    "quote_sent" boolean DEFAULT false,
    "quote_sent_at" timestamp with time zone,
    "quote_token" "text",
    "quote_confirmed" boolean DEFAULT false,
    "quote_confirmed_at" timestamp with time zone,
    "repair_approved" boolean,
    CONSTRAINT "jobs_contact_type_check" CHECK (("contact_type" = ANY (ARRAY['primary'::"text", 'secondary'::"text", 'emergency'::"text"]))),
    CONSTRAINT "jobs_service_line_check" CHECK (("service_line" = ANY (ARRAY['ACON'::"text", 'ACURT'::"text", 'ATU'::"text", 'CWATER'::"text", 'CHLLR'::"text", 'CFCTRL'::"text", 'CAIRH'::"text", 'CAIRQ'::"text", 'CCTRL'::"text", 'CCOOL'::"text", 'CDUCT'::"text", 'CHPMP'::"text", 'COMHEAT'::"text", 'COMP'::"text", 'CRAC'::"text", 'CRAH'::"text", 'CU'::"text", 'COOL'::"text", 'COOLING'::"text", 'COOLTWR'::"text", 'DCOOL'::"text", 'EHEAT'::"text", 'EQMAINT'::"text", 'EVACLR'::"text", 'FCU'::"text", 'FREEZE'::"text", 'FUELPMP'::"text", 'FURN'::"text", 'GEO'::"text", 'GEOTHERM'::"text", 'HEXCH'::"text", 'HRVERV'::"text", 'HEATNG'::"text", 'HUMID'::"text", 'HVACGEN'::"text", 'HVACR'::"text", 'ICEMA'::"text", 'ICRNK'::"text", 'MUAS'::"text", 'MOTOR'::"text", 'OFFC'::"text", 'OTHR'::"text", 'PAID'::"text", 'PCOOL'::"text", 'PIPING'::"text", 'PLAN'::"text", 'POOLDEHUM'::"text", 'PRTAB'::"text", 'PGR'::"text", 'RECOIL'::"text", 'RICOO'::"text", 'REFRG'::"text", 'RAIRH'::"text", 'RAIRQ'::"text", 'RCTRL'::"text", 'RCOOL'::"text", 'RDUCT'::"text", 'RHPMP'::"text", 'RHEAT'::"text", 'RTU'::"text", 'SAFT'::"text", 'SHOP'::"text", 'SICK'::"text", 'TESTBAL'::"text", 'THERM'::"text", 'TRNG'::"text", 'UHEAT'::"text", 'UNPAID'::"text", 'VMAINT'::"text", 'VENT'::"text", 'WICOO'::"text", 'WIFRE'::"text", 'WHLSLE'::"text"]))),
    CONSTRAINT "jobs_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'unscheduled'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "jobs_type_check" CHECK (("type" = ANY (ARRAY['administrative'::"text", 'buildout'::"text", 'cleaning'::"text", 'construction'::"text", 'consultation'::"text", 'delivery'::"text", 'design'::"text", 'emergency service call'::"text", 'exchange'::"text", 'hookup'::"text", 'inspection'::"text", 'inspection repair'::"text", 'installation'::"text", 'pickup'::"text", 'planned maintenance'::"text", 'preventative maintenance'::"text", 'priority inspection'::"text", 'priority service call'::"text", 'quality assurance'::"text", 'reinspection'::"text", 'repair'::"text", 'replacement'::"text", 'retrofit'::"text", 'sales'::"text", 'service call'::"text", 'start up'::"text", 'survey'::"text", 'testing'::"text", 'training'::"text", 'unknown'::"text", 'upgrade'::"text", 'urgent service call'::"text", 'warranty call'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "zip" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "building_name" "text" DEFAULT 'Main Building'::"text" NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "short_description" "text" NOT NULL,
    "github_url" "text" NOT NULL,
    "live_url" "text",
    "main_image" "text" NOT NULL,
    "gallery_images" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "technologies" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "featured" boolean DEFAULT false
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."service_lines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "priority" "text" NOT NULL,
    "due_date" "date",
    "category" "text" NOT NULL,
    "completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reminder_email" boolean DEFAULT false,
    "reminder_date" timestamp with time zone,
    "reminder" boolean DEFAULT false
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technician_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "technician_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_available" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "technician_availability_day_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "technician_availability_time_check" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."technician_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technician_certifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "technician_id" "uuid" NOT NULL,
    "certification_name" "text" NOT NULL,
    "issuing_organization" "text" NOT NULL,
    "certification_number" "text",
    "issue_date" "date" NOT NULL,
    "expiry_date" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "document_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "technician_certifications_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."technician_certifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technician_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "technician_id" "uuid" NOT NULL,
    "skill_name" "text" NOT NULL,
    "proficiency_level" "text" NOT NULL,
    "years_experience" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "technician_skills_proficiency_check" CHECK (("proficiency_level" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text", 'expert'::"text"])))
);


ALTER TABLE "public"."technician_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technician_territories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "technician_id" "uuid" NOT NULL,
    "territory_name" "text" NOT NULL,
    "state" "text" NOT NULL,
    "zip_codes" "text"[] NOT NULL,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."technician_territories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technicians" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "text",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "hire_date" "date" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "job_title" "text" NOT NULL,
    "hourly_rate" numeric(10,2),
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "address" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "license_number" "text",
    "license_expiry" "date",
    "vehicle_number" "text",
    "vehicle_make" "text",
    "vehicle_model" "text",
    "vehicle_year" "text",
    "shirt_size" "text",
    "boot_size" "text",
    "preferred_name" "text",
    "tax_id" "text",
    "direct_deposit" boolean DEFAULT false,
    "bank_name" "text",
    "bank_routing" "text",
    "bank_account" "text",
    "background_check_date" "date",
    "drug_test_date" "date",
    "last_review_date" "date",
    "next_review_date" "date",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "technicians_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'on_leave'::"text"])))
);


ALTER TABLE "public"."technicians" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "unit_number" "text" NOT NULL,
    "status" "text" DEFAULT 'Active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "phone" "text",
    "primary_contact_type" "text",
    "primary_contact_email" "text",
    "primary_contact_phone" "text",
    "billing_entity" "text",
    "billing_email" "text",
    "billing_city" "text",
    "billing_state" "text",
    "billing_zip" "text",
    "office" "text",
    "taxable" boolean,
    "tax_group_name" "text",
    "tax_group_code" "text",
    "email" "text",
    CONSTRAINT "units_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "services" "text"[],
    "office_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'technician'::"text", 'user'::"text"]))),
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuration"
    ADD CONSTRAINT "configuration_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."configuration"
    ADD CONSTRAINT "configuration_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_assets"
    ADD CONSTRAINT "job_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_attachments"
    ADD CONSTRAINT "job_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_clock_events"
    ADD CONSTRAINT "job_clock_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_comments"
    ADD CONSTRAINT "job_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_deficiencies"
    ADD CONSTRAINT "job_deficiencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_inspections"
    ADD CONSTRAINT "job_inspections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_invoices"
    ADD CONSTRAINT "job_invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."job_invoices"
    ADD CONSTRAINT "job_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_labor_prices"
    ADD CONSTRAINT "job_item_labor_prices_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."job_labor_prices"
    ADD CONSTRAINT "job_item_labor_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_item_prices"
    ADD CONSTRAINT "job_item_prices_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."job_item_prices"
    ADD CONSTRAINT "job_item_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_items"
    ADD CONSTRAINT "job_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_presets"
    ADD CONSTRAINT "job_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_replacements"
    ADD CONSTRAINT "job_replacements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_technicians"
    ADD CONSTRAINT "job_technicians_job_id_technician_id_key" UNIQUE ("job_id", "technician_id");



ALTER TABLE ONLY "public"."job_technicians"
    ADD CONSTRAINT "job_technicians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_types"
    ADD CONSTRAINT "job_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."job_types"
    ADD CONSTRAINT "job_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."job_types"
    ADD CONSTRAINT "job_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_number_key" UNIQUE ("number");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_lines"
    ADD CONSTRAINT "service_lines_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."service_lines"
    ADD CONSTRAINT "service_lines_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."service_lines"
    ADD CONSTRAINT "service_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_availability"
    ADD CONSTRAINT "technician_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_certifications"
    ADD CONSTRAINT "technician_certifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_skills"
    ADD CONSTRAINT "technician_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_territories"
    ADD CONSTRAINT "technician_territories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technicians"
    ADD CONSTRAINT "technicians_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."technicians"
    ADD CONSTRAINT "technicians_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."technicians"
    ADD CONSTRAINT "technicians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_location_id_unit_number_key" UNIQUE ("location_id", "unit_number");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



CREATE INDEX "comments_show_id_timestamp_idx" ON "public"."comments" USING "btree" ("show_id", "timestamp");



CREATE INDEX "companies_name_idx" ON "public"."companies" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "job_assets_job_id_idx" ON "public"."job_assets" USING "btree" ("job_id");



CREATE INDEX "job_attachments_job_id_idx" ON "public"."job_attachments" USING "btree" ("job_id");



CREATE INDEX "job_clock_events_job_id_idx" ON "public"."job_clock_events" USING "btree" ("job_id");



CREATE INDEX "job_comments_job_id_idx" ON "public"."job_comments" USING "btree" ("job_id");



CREATE INDEX "job_deficiencies_job_id_idx" ON "public"."job_deficiencies" USING "btree" ("job_id");



CREATE INDEX "job_inspections_job_id_idx" ON "public"."job_inspections" USING "btree" ("job_id");



CREATE INDEX "job_invoices_job_id_idx" ON "public"."job_invoices" USING "btree" ("job_id");



CREATE INDEX "job_item_labor_prices_code_idx" ON "public"."job_labor_prices" USING "btree" ("code");



CREATE INDEX "job_item_labor_prices_service_line_idx" ON "public"."job_labor_prices" USING "btree" ("service_line");



CREATE INDEX "job_item_prices_code_idx" ON "public"."job_item_prices" USING "btree" ("code");



CREATE INDEX "job_item_prices_service_line_idx" ON "public"."job_item_prices" USING "btree" ("service_line");



CREATE INDEX "job_item_prices_type_idx" ON "public"."job_item_prices" USING "btree" ("type");



CREATE INDEX "job_items_job_id_idx" ON "public"."job_items" USING "btree" ("job_id");



CREATE INDEX "job_presets_name_idx" ON "public"."job_presets" USING "btree" ("name");



CREATE INDEX "job_presets_user_id_idx" ON "public"."job_presets" USING "btree" ("user_id");



CREATE INDEX "job_replacements_job_id_idx" ON "public"."job_replacements" USING "btree" ("job_id");



CREATE INDEX "job_technicians_job_id_idx" ON "public"."job_technicians" USING "btree" ("job_id");



CREATE INDEX "job_technicians_technician_id_idx" ON "public"."job_technicians" USING "btree" ("technician_id");



CREATE INDEX "job_types_code_idx" ON "public"."job_types" USING "btree" ("code");



CREATE INDEX "jobs_location_id_idx" ON "public"."jobs" USING "btree" ("location_id");



CREATE INDEX "jobs_number_idx" ON "public"."jobs" USING "btree" ("number");



CREATE INDEX "jobs_owner_id_idx" ON "public"."jobs" USING "btree" ("owner_id");



CREATE INDEX "jobs_unit_id_idx" ON "public"."jobs" USING "btree" ("unit_id");



CREATE INDEX "locations_company_id_idx" ON "public"."locations" USING "btree" ("company_id");



CREATE INDEX "service_lines_code_idx" ON "public"."service_lines" USING "btree" ("code");



CREATE INDEX "technician_availability_technician_id_idx" ON "public"."technician_availability" USING "btree" ("technician_id");



CREATE INDEX "technician_certifications_technician_id_idx" ON "public"."technician_certifications" USING "btree" ("technician_id");



CREATE INDEX "technician_skills_technician_id_idx" ON "public"."technician_skills" USING "btree" ("technician_id");



CREATE INDEX "technician_territories_technician_id_idx" ON "public"."technician_territories" USING "btree" ("technician_id");



CREATE INDEX "technicians_email_idx" ON "public"."technicians" USING "btree" ("email");



CREATE INDEX "technicians_employee_id_idx" ON "public"."technicians" USING "btree" ("employee_id");



CREATE INDEX "units_location_id_idx" ON "public"."units" USING "btree" ("location_id");



CREATE INDEX "users_email_idx" ON "public"."users" USING "btree" ("email");



CREATE INDEX "users_username_idx" ON "public"."users" USING "btree" ("username");



CREATE OR REPLACE TRIGGER "set_job_number" BEFORE INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."generate_job_number"();



CREATE OR REPLACE TRIGGER "update_job_inspections_updated_at" BEFORE UPDATE ON "public"."job_inspections" FOR EACH ROW EXECUTE FUNCTION "public"."update_job_inspections_updated_at"();



CREATE OR REPLACE TRIGGER "update_job_item_labor_prices_updated_at" BEFORE UPDATE ON "public"."job_labor_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_job_item_prices_updated_at" BEFORE UPDATE ON "public"."job_item_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_job_replacements_updated_at" BEFORE UPDATE ON "public"."job_replacements" FOR EACH ROW EXECUTE FUNCTION "public"."update_job_replacements_updated_at"();



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."job_assets"
    ADD CONSTRAINT "job_assets_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_attachments"
    ADD CONSTRAINT "job_attachments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_attachments"
    ADD CONSTRAINT "job_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."job_clock_events"
    ADD CONSTRAINT "job_clock_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_clock_events"
    ADD CONSTRAINT "job_clock_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."job_comments"
    ADD CONSTRAINT "job_comments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_comments"
    ADD CONSTRAINT "job_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."job_deficiencies"
    ADD CONSTRAINT "job_deficiencies_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_inspections"
    ADD CONSTRAINT "job_inspections_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_invoices"
    ADD CONSTRAINT "job_invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_items"
    ADD CONSTRAINT "job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_presets"
    ADD CONSTRAINT "job_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."job_replacements"
    ADD CONSTRAINT "job_replacements_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_technicians"
    ADD CONSTRAINT "job_technicians_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_technicians"
    ADD CONSTRAINT "job_technicians_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."technician_availability"
    ADD CONSTRAINT "technician_availability_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."technician_certifications"
    ADD CONSTRAINT "technician_certifications_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."technician_skills"
    ADD CONSTRAINT "technician_skills_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."technician_territories"
    ADD CONSTRAINT "technician_territories_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users to manage projects" ON "public"."projects" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to manage their projects" ON "public"."projects" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read access" ON "public"."projects" FOR SELECT USING (true);



CREATE POLICY "Anyone can insert contacts" ON "public"."contacts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read comments" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Anyone can read configuration" ON "public"."configuration" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can manage configuration" ON "public"."configuration" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can view contacts" ON "public"."contacts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_assets" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_attachments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_clock_events" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_comments" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_deficiencies" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_inspections" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_invoices" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_item_prices" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_labor_prices" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_replacements" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_technicians" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."job_types" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."jobs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."service_lines" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."settings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."technician_availability" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."technician_certifications" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."technician_skills" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."technician_territories" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."technicians" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."users" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable delete for authenticated users only" ON "public"."companies" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users only" ON "public"."locations" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users only" ON "public"."units" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."locations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."units" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."companies" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_assets" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_attachments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_clock_events" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_comments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_deficiencies" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_inspections" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_invoices" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_item_prices" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_items" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_labor_prices" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_replacements" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_technicians" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."job_types" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."jobs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."locations" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."service_lines" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."settings" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."technician_availability" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."technician_certifications" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."technician_skills" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."technician_territories" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."technicians" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."units" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."companies" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."locations" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."units" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create own presets" ON "public"."job_presets" FOR INSERT TO "authenticated" WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."username" = CURRENT_USER))));



CREATE POLICY "Users can delete own presets" ON "public"."job_presets" FOR DELETE TO "authenticated" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."username" = CURRENT_USER))));



CREATE POLICY "Users can delete own tasks" ON "public"."tasks" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own tasks" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can perform all operations on tags" ON "public"."tags" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Users can read own tasks" ON "public"."tasks" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own presets" ON "public"."job_presets" FOR UPDATE TO "authenticated" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."username" = CURRENT_USER)))) WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."username" = CURRENT_USER))));



CREATE POLICY "Users can update own tasks" ON "public"."tasks" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all presets" ON "public"."job_presets" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."job_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_deficiencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."technician_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."technician_certifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."technician_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."technician_territories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."technicians" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."generate_job_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_job_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_job_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_job_inspections_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_job_inspections_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_inspections_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_job_replacements_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_job_replacements_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_replacements_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";



























GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."configuration" TO "anon";
GRANT ALL ON TABLE "public"."configuration" TO "authenticated";
GRANT ALL ON TABLE "public"."configuration" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."job_assets" TO "anon";
GRANT ALL ON TABLE "public"."job_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."job_assets" TO "service_role";



GRANT ALL ON TABLE "public"."job_attachments" TO "anon";
GRANT ALL ON TABLE "public"."job_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."job_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."job_clock_events" TO "anon";
GRANT ALL ON TABLE "public"."job_clock_events" TO "authenticated";
GRANT ALL ON TABLE "public"."job_clock_events" TO "service_role";



GRANT ALL ON TABLE "public"."job_comments" TO "anon";
GRANT ALL ON TABLE "public"."job_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."job_comments" TO "service_role";



GRANT ALL ON TABLE "public"."job_deficiencies" TO "anon";
GRANT ALL ON TABLE "public"."job_deficiencies" TO "authenticated";
GRANT ALL ON TABLE "public"."job_deficiencies" TO "service_role";



GRANT ALL ON TABLE "public"."job_inspections" TO "anon";
GRANT ALL ON TABLE "public"."job_inspections" TO "authenticated";
GRANT ALL ON TABLE "public"."job_inspections" TO "service_role";
GRANT SELECT ON TABLE "public"."job_inspections" TO PUBLIC;



GRANT ALL ON TABLE "public"."job_invoices" TO "anon";
GRANT ALL ON TABLE "public"."job_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."job_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."job_item_prices" TO "anon";
GRANT ALL ON TABLE "public"."job_item_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."job_item_prices" TO "service_role";



GRANT ALL ON TABLE "public"."job_items" TO "anon";
GRANT ALL ON TABLE "public"."job_items" TO "authenticated";
GRANT ALL ON TABLE "public"."job_items" TO "service_role";



GRANT ALL ON TABLE "public"."job_labor_prices" TO "anon";
GRANT ALL ON TABLE "public"."job_labor_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."job_labor_prices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."job_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."job_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."job_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."job_part_prices" TO "anon";
GRANT ALL ON TABLE "public"."job_part_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."job_part_prices" TO "service_role";



GRANT ALL ON TABLE "public"."job_presets" TO "anon";
GRANT ALL ON TABLE "public"."job_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."job_presets" TO "service_role";



GRANT ALL ON TABLE "public"."job_replacements" TO "anon";
GRANT ALL ON TABLE "public"."job_replacements" TO "authenticated";
GRANT ALL ON TABLE "public"."job_replacements" TO "service_role";
GRANT SELECT ON TABLE "public"."job_replacements" TO PUBLIC;



GRANT ALL ON TABLE "public"."job_technicians" TO "anon";
GRANT ALL ON TABLE "public"."job_technicians" TO "authenticated";
GRANT ALL ON TABLE "public"."job_technicians" TO "service_role";



GRANT ALL ON TABLE "public"."job_types" TO "anon";
GRANT ALL ON TABLE "public"."job_types" TO "authenticated";
GRANT ALL ON TABLE "public"."job_types" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."service_lines" TO "anon";
GRANT ALL ON TABLE "public"."service_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."service_lines" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."technician_availability" TO "anon";
GRANT ALL ON TABLE "public"."technician_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."technician_availability" TO "service_role";



GRANT ALL ON TABLE "public"."technician_certifications" TO "anon";
GRANT ALL ON TABLE "public"."technician_certifications" TO "authenticated";
GRANT ALL ON TABLE "public"."technician_certifications" TO "service_role";



GRANT ALL ON TABLE "public"."technician_skills" TO "anon";
GRANT ALL ON TABLE "public"."technician_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."technician_skills" TO "service_role";



GRANT ALL ON TABLE "public"."technician_territories" TO "anon";
GRANT ALL ON TABLE "public"."technician_territories" TO "authenticated";
GRANT ALL ON TABLE "public"."technician_territories" TO "service_role";



GRANT ALL ON TABLE "public"."technicians" TO "anon";
GRANT ALL ON TABLE "public"."technicians" TO "authenticated";
GRANT ALL ON TABLE "public"."technicians" TO "service_role";



GRANT ALL ON TABLE "public"."units" TO "anon";
GRANT ALL ON TABLE "public"."units" TO "authenticated";
GRANT ALL ON TABLE "public"."units" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
