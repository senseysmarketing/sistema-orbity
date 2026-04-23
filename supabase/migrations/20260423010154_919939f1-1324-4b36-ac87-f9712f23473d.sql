
CREATE OR REPLACE FUNCTION public.delete_agency_cascade(p_agency_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  master_id uuid := '7bef1258-af3d-48cc-b3a7-f79fac29c7c0';
  v_client_ids uuid[];
  v_lead_ids uuid[];
  v_task_ids uuid[];
  v_payment_ids uuid[];
  v_subscription_ids uuid[];
BEGIN
  IF p_agency_id IS NULL THEN
    RAISE EXCEPTION 'agency_id is required';
  END IF;
  
  IF p_agency_id = master_id THEN
    RAISE EXCEPTION 'Cannot delete master agency';
  END IF;

  -- Collect dependent IDs
  SELECT array_agg(id) INTO v_client_ids FROM public.clients WHERE agency_id = p_agency_id;
  SELECT array_agg(id) INTO v_lead_ids FROM public.leads WHERE agency_id = p_agency_id;
  SELECT array_agg(id) INTO v_task_ids FROM public.tasks WHERE agency_id = p_agency_id;
  SELECT array_agg(id) INTO v_payment_ids FROM public.client_payments WHERE agency_id = p_agency_id;
  SELECT array_agg(id) INTO v_subscription_ids FROM public.agency_subscriptions WHERE agency_id = p_agency_id;

  -- Notifications & related
  DELETE FROM public.notification_delivery_logs WHERE agency_id = p_agency_id;
  DELETE FROM public.notification_tracking WHERE agency_id = p_agency_id;
  DELETE FROM public.notification_queue WHERE agency_id = p_agency_id;
  DELETE FROM public.notification_event_preferences WHERE agency_id = p_agency_id;
  DELETE FROM public.notification_preferences WHERE agency_id = p_agency_id;
  DELETE FROM public.notification_integrations WHERE agency_id = p_agency_id;
  DELETE FROM public.user_notification_channels WHERE agency_id = p_agency_id;
  DELETE FROM public.notifications WHERE agency_id = p_agency_id;
  DELETE FROM public.agency_notification_rules WHERE agency_id = p_agency_id;
  DELETE FROM public.push_subscriptions WHERE agency_id = p_agency_id;

  -- CRM / Leads
  IF v_lead_ids IS NOT NULL THEN
    DELETE FROM public.lead_activities WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_scoring_results WHERE lead_id = ANY(v_lead_ids);
  END IF;
  DELETE FROM public.lead_activities WHERE agency_id = p_agency_id;
  DELETE FROM public.lead_history WHERE agency_id = p_agency_id;
  DELETE FROM public.lead_scoring_results WHERE agency_id = p_agency_id;
  DELETE FROM public.lead_scoring_rules WHERE agency_id = p_agency_id;
  DELETE FROM public.lead_statuses WHERE agency_id = p_agency_id;
  DELETE FROM public.leads WHERE agency_id = p_agency_id;

  -- Tasks
  IF v_task_ids IS NOT NULL THEN
    DELETE FROM public.task_assignments WHERE task_id = ANY(v_task_ids);
    DELETE FROM public.task_clients WHERE task_id = ANY(v_task_ids);
  END IF;
  DELETE FROM public.task_templates WHERE agency_id = p_agency_id;
  DELETE FROM public.task_statuses WHERE agency_id = p_agency_id;
  DELETE FROM public.task_types WHERE agency_id = p_agency_id;
  DELETE FROM public.tasks WHERE agency_id = p_agency_id;

  -- Content / Social
  DELETE FROM public.content_library WHERE agency_id = p_agency_id;
  DELETE FROM public.content_plans WHERE agency_id = p_agency_id;
  DELETE FROM public.social_media_approval_rules WHERE agency_id = p_agency_id;
  DELETE FROM public.social_media_content_types WHERE agency_id = p_agency_id;
  DELETE FROM public.social_media_custom_statuses WHERE agency_id = p_agency_id;
  DELETE FROM public.social_media_platforms WHERE agency_id = p_agency_id;
  DELETE FROM public.social_media_post_templates WHERE agency_id = p_agency_id;
  DELETE FROM public.social_media_posts_deprecated WHERE agency_id = p_agency_id;
  DELETE FROM public.social_media_schedule_preferences WHERE agency_id = p_agency_id;
  DELETE FROM public.social_media_settings WHERE agency_id = p_agency_id;

  -- Meetings, reminders, notes, routines
  DELETE FROM public.meetings WHERE agency_id = p_agency_id;
  DELETE FROM public.reminders WHERE agency_id = p_agency_id;
  DELETE FROM public.reminder_lists WHERE agency_id = p_agency_id;
  DELETE FROM public.notes WHERE agency_id = p_agency_id;
  DELETE FROM public.admin_notes WHERE agency_id = p_agency_id;
  DELETE FROM public.routines WHERE agency_id = p_agency_id;

  -- NPS
  DELETE FROM public.nps_tokens WHERE agency_id = p_agency_id;
  DELETE FROM public.nps_responses WHERE agency_id = p_agency_id;
  DELETE FROM public.nps_settings WHERE agency_id = p_agency_id;

  -- Projects
  DELETE FROM public.project_tasks WHERE agency_id = p_agency_id;
  DELETE FROM public.project_payments WHERE agency_id = p_agency_id;
  DELETE FROM public.project_milestones WHERE agency_id = p_agency_id;
  DELETE FROM public.project_notes WHERE agency_id = p_agency_id;
  DELETE FROM public.projects WHERE agency_id = p_agency_id;

  -- Goals / Bonus / HR
  DELETE FROM public.bonus_periods WHERE agency_id = p_agency_id;
  DELETE FROM public.bonus_programs WHERE agency_id = p_agency_id;
  DELETE FROM public.employee_scorecards WHERE agency_id = p_agency_id;
  DELETE FROM public.employees WHERE agency_id = p_agency_id;
  DELETE FROM public.salaries WHERE agency_id = p_agency_id;
  DELETE FROM public.user_achievements WHERE agency_id = p_agency_id;

  -- Financial
  DELETE FROM public.billing_message_logs WHERE agency_id = p_agency_id;
  DELETE FROM public.billing_history WHERE agency_id = p_agency_id;
  DELETE FROM public.client_payments WHERE agency_id = p_agency_id;
  DELETE FROM public.expenses WHERE agency_id = p_agency_id;
  DELETE FROM public.expense_categories WHERE agency_id = p_agency_id;
  DELETE FROM public.crm_investments WHERE agency_id = p_agency_id;
  DELETE FROM public.monthly_closures WHERE agency_id = p_agency_id;
  DELETE FROM public.monthly_snapshots WHERE agency_id = p_agency_id;
  DELETE FROM public.usage_metrics WHERE agency_id = p_agency_id;

  -- Contracts
  DELETE FROM public.contracts WHERE agency_id = p_agency_id;
  DELETE FROM public.contract_templates WHERE agency_id = p_agency_id;
  DELETE FROM public.contract_services_templates WHERE agency_id = p_agency_id;

  -- Clients
  IF v_client_ids IS NOT NULL THEN
    DELETE FROM public.client_credential_history WHERE client_id = ANY(v_client_ids);
    DELETE FROM public.client_credentials WHERE client_id = ANY(v_client_ids);
    DELETE FROM public.client_files WHERE client_id = ANY(v_client_ids);
    DELETE FROM public.client_notes WHERE client_id = ANY(v_client_ids);
  END IF;
  DELETE FROM public.client_credential_history WHERE agency_id = p_agency_id;
  DELETE FROM public.client_credentials WHERE agency_id = p_agency_id;
  DELETE FROM public.client_files WHERE agency_id = p_agency_id;
  DELETE FROM public.client_notes WHERE agency_id = p_agency_id;
  DELETE FROM public.campaigns WHERE agency_id = p_agency_id;
  DELETE FROM public.clients WHERE agency_id = p_agency_id;

  -- Integrations: Meta / Facebook
  DELETE FROM public.facebook_lead_sync_log WHERE agency_id = p_agency_id;
  DELETE FROM public.facebook_lead_integrations WHERE agency_id = p_agency_id;
  DELETE FROM public.facebook_pixels WHERE agency_id = p_agency_id;
  DELETE FROM public.facebook_api_audit WHERE agency_id = p_agency_id;
  DELETE FROM public.facebook_connections WHERE agency_id = p_agency_id;
  DELETE FROM public.meta_conversion_events WHERE agency_id = p_agency_id;

  -- Ad accounts
  DELETE FROM public.ad_account_metrics WHERE agency_id = p_agency_id;
  DELETE FROM public.ad_account_balance_settings WHERE agency_id = p_agency_id;
  -- Clear FK on agencies first (to allow selected_ad_accounts deletion)
  UPDATE public.agencies SET crm_ad_account_id = NULL WHERE id = p_agency_id;
  DELETE FROM public.selected_ad_accounts WHERE agency_id = p_agency_id;
  DELETE FROM public.traffic_control_comments WHERE agency_id = p_agency_id;
  DELETE FROM public.traffic_controls WHERE agency_id = p_agency_id;

  -- Google
  DELETE FROM public.google_calendar_connections WHERE agency_id = p_agency_id;

  -- WhatsApp
  DELETE FROM public.whatsapp_message_templates WHERE agency_id = p_agency_id;
  DELETE FROM public.whatsapp_accounts WHERE agency_id = p_agency_id;

  -- Imports
  DELETE FROM public.import_logs WHERE agency_id = p_agency_id;
  DELETE FROM public.import_jobs WHERE agency_id = p_agency_id;

  -- AI / webhooks / config
  DELETE FROM public.agency_ai_prompts WHERE agency_id = p_agency_id;
  DELETE FROM public.agency_webhooks WHERE agency_id = p_agency_id;
  DELETE FROM public.agency_payment_settings WHERE agency_id = p_agency_id;
  DELETE FROM public.agency_onboarding WHERE agency_id = p_agency_id;
  DELETE FROM public.agency_invites WHERE agency_id = p_agency_id;

  -- Subscription / users / agency itself (last)
  DELETE FROM public.agency_subscriptions WHERE agency_id = p_agency_id;
  DELETE FROM public.agency_users WHERE agency_id = p_agency_id;
  DELETE FROM public.agencies WHERE id = p_agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_agency_cascade(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_agency_cascade(uuid) TO service_role;
