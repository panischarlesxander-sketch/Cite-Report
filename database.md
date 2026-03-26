-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.announcements (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_by bigint,
  target_role text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user(id)
);
CREATE TABLE public.user (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_number text,
  first_name text,
  email text,
  last_name text,
  role text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  password text,
  position text,
  signature_url text,
  signature_size integer DEFAULT 100,
  CONSTRAINT user_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wfh_accomplishments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  entry_id bigint,
  content text,
  CONSTRAINT wfh_accomplishments_pkey PRIMARY KEY (id),
  CONSTRAINT wfh_accomplishments_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.wfh_entries(id)
);
CREATE TABLE public.wfh_approvals (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  report_id bigint,
  role text,
  name text,
  approved boolean DEFAULT false,
  approved_at timestamp without time zone,
  CONSTRAINT wfh_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT wfh_approvals_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.wfh_reports(id)
);
CREATE TABLE public.wfh_entries (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  report_id bigint,
  section text,
  title text,
  entry_date date,
  time_range text,
  remarks text,
  approved_date date,
  CONSTRAINT wfh_entries_pkey PRIMARY KEY (id),
  CONSTRAINT wfh_entries_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.wfh_reports(id)
);
CREATE TABLE public.wfh_instruction_bullets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  item_id bigint,
  content text,
  CONSTRAINT wfh_instruction_bullets_pkey PRIMARY KEY (id),
  CONSTRAINT wfh_instruction_bullets_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.wfh_instruction_items(id)
);
CREATE TABLE public.wfh_instruction_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  entry_id bigint,
  title text,
  CONSTRAINT wfh_instruction_items_pkey PRIMARY KEY (id),
  CONSTRAINT wfh_instruction_items_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.wfh_entries(id)
);
CREATE TABLE public.wfh_issues (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  entry_id bigint,
  content text,
  CONSTRAINT wfh_issues_pkey PRIMARY KEY (id),
  CONSTRAINT wfh_issues_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.wfh_entries(id)
);
CREATE TABLE public.wfh_reports (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint,
  report_date date,
  college text,
  department text,
  faculty_name text,
  position text,
  created_at timestamp with time zone DEFAULT now(),
  designation text,
  prepared_date date,
  reviewed_date date,
  approved_date date,
  attachments text,
  footer_remarks_1 text,
  footer_remarks_2 text,
  chair_signature text,
  dean_signature text,
  status text DEFAULT 'Pending'::text,
  rejection_reason text,
  CONSTRAINT wfh_reports_pkey PRIMARY KEY (id),
  CONSTRAINT wfh_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(id)
);