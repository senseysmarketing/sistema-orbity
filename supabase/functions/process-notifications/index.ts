import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { toZonedTime } from 'https://esm.sh/date-fns-tz@3.2.0';
import { addDays, addHours } from 'https://esm.sh/date-fns@3.6.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TIMEZONE = 'America/Sao_Paulo';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationData {
  user_id: string;
  agency_id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  metadata?: any;
}

interface BatchTrackingRecord {
  notification_type: string;
  entity_id: string;
  user_id: string;
  agency_id: string;
}

// ============================================
// BATCH PROCESSING HELPERS
// ============================================

async function batchCheckNotifications(
  records: BatchTrackingRecord[],
  minIntervalHours: number = 24
): Promise<Set<string>> {
  if (records.length === 0) return new Set();

  const entityIds = [...new Set(records.map(r => r.entity_id))];
  const userIds = [...new Set(records.map(r => r.user_id))];
  
  const { data, error } = await supabase
    .from('notification_tracking')
    .select('entity_id, user_id, last_sent_at')
    .in('entity_id', entityIds)
    .in('user_id', userIds);

  if (error) {
    console.error('Error batch checking notifications:', error);
    return new Set();
  }

  const recentlySent = new Set<string>();
  const now = new Date();

  data?.forEach(record => {
    const lastSent = new Date(record.last_sent_at);
    const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < minIntervalHours) {
      recentlySent.add(`${record.entity_id}_${record.user_id}`);
    }
  });

  return recentlySent;
}

async function batchTrackNotifications(records: BatchTrackingRecord[]) {
  if (records.length === 0) return;

  const now = new Date().toISOString();
  const upsertData = records.map(r => ({
    notification_type: r.notification_type,
    entity_id: r.entity_id,
    user_id: r.user_id,
    agency_id: r.agency_id,
    last_sent_at: now
  }));

  const { error } = await supabase
    .from('notification_tracking')
    .upsert(upsertData, {
      onConflict: 'notification_type,entity_id,user_id'
    });

  if (error) {
    console.error('Error batch tracking notifications:', error);
  }
}

async function batchCreateNotifications(notifications: NotificationData[]) {
  if (notifications.length === 0) return;

  const { error } = await supabase
    .from('notifications')
    .insert(notifications);

  if (error) {
    console.error('Error batch creating notifications:', error);
  }
}

// ============================================
// USER PREFERENCES & UTILITY FUNCTIONS
// ============================================

function getTodayInBrasilia(): Date {
  const nowUtc = new Date();
  const nowBrasilia = toZonedTime(nowUtc, TIMEZONE);
  nowBrasilia.setHours(0, 0, 0, 0);
  return nowBrasilia;
}

async function checkUserPreferences(
  userId: string,
  agencyId: string,
  notificationType: string
): Promise<boolean> {
  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (!preferences) return true;

  const typeEnabled = {
    'reminders': preferences.reminders_enabled,
    'tasks': preferences.tasks_enabled,
    'posts': preferences.posts_enabled,
    'payments': preferences.payments_enabled,
    'leads': preferences.leads_enabled,
    'meetings': preferences.meetings_enabled,
    'system': preferences.system_enabled,
  }[notificationType];

  if (typeEnabled === false) return false;

  if (preferences.do_not_disturb_until && new Date(preferences.do_not_disturb_until) > new Date()) {
    return false;
  }

  return true;
}

// ============================================
// NOTIFICATION PROCESSORS
// ============================================

async function processReminders() {
  console.log('⏰ Processing reminder notifications...');
  
  const now = new Date();
  const in2Hours = addHours(now, 2);

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('completed', false)
    .eq('notification_enabled', true)
    .not('reminder_time', 'is', null)
    .lte('reminder_time', in2Hours.toISOString());

  if (error) {
    console.error('Error fetching reminders:', error);
    return;
  }

  console.log(`📊 Found ${reminders?.length || 0} reminders to process`);

  const notificationsToCreate: NotificationData[] = [];
  const remindersToUpdate: { id: string; last_notification_sent: string }[] = [];

  for (const reminder of reminders || []) {
    const reminderTime = new Date(reminder.reminder_time);
    const minutesBefore = reminder.notification_minutes_before || 0;
    const notificationTime = new Date(reminderTime.getTime() - minutesBefore * 60000);

    const alreadySent = reminder.last_notification_sent && 
      new Date(reminder.last_notification_sent) >= notificationTime;
    
    if (notificationTime <= now && !alreadySent) {
      let agencyId = reminder.agency_id;
      if (!agencyId) {
        const { data: userAgency } = await supabase
          .from('agency_users')
          .select('agency_id')
          .eq('user_id', reminder.user_id)
          .single();
        agencyId = userAgency?.agency_id;
      }

      const canSend = await checkUserPreferences(reminder.user_id, agencyId, 'reminders');
      if (!canSend) continue;

      notificationsToCreate.push({
        user_id: reminder.user_id,
        agency_id: agencyId,
        type: 'reminder',
        priority: reminder.priority === 'high' ? 'high' : 'medium',
        title: '⏰ Lembrete',
        message: reminder.title,
        action_url: '/reminders',
        action_label: 'Ver lembrete',
        metadata: { 
          reminder_id: reminder.id,
          play_sound: true
        },
      });

      remindersToUpdate.push({
        id: reminder.id,
        last_notification_sent: now.toISOString()
      });
    }
  }

  await batchCreateNotifications(notificationsToCreate);

  // Update last_notification_sent for reminders
  for (const update of remindersToUpdate) {
    await supabase
      .from('reminders')
      .update({ last_notification_sent: update.last_notification_sent })
      .eq('id', update.id);
  }

  console.log(`✅ Created ${notificationsToCreate.length} reminder notifications`);
}

async function processTasks() {
  console.log('📋 Processing task notifications...');
  
  const now = new Date();
  const in24Hours = addHours(now, 24);
  const oneDayAgo = addHours(now, -24);

  // Query OTIMIZADA: usa o novo campo notification_sent_at
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      due_date,
      agency_id,
      notification_sent_at,
      task_assignments(user_id)
    `)
    .neq('status', 'done')
    .eq('archived', false)
    .gte('due_date', now.toISOString())
    .lte('due_date', in24Hours.toISOString())
    .or(`notification_sent_at.is.null,notification_sent_at.lt.${oneDayAgo.toISOString()}`);

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  console.log(`📊 Found ${tasks?.length || 0} tasks to notify`);

  const notificationsToCreate: NotificationData[] = [];
  const tasksToUpdate: string[] = [];

  for (const task of tasks || []) {
    if (!task.agency_id) continue;

    for (const assignment of task.task_assignments || []) {
      const canSend = await checkUserPreferences(assignment.user_id, task.agency_id, 'tasks');
      if (!canSend) continue;

      notificationsToCreate.push({
        user_id: assignment.user_id,
        agency_id: task.agency_id,
        type: 'task',
        priority: 'medium',
        title: '📋 Tarefa próxima do prazo',
        message: task.title,
        action_url: '/tasks',
        action_label: 'Ver tarefa',
        metadata: { 
          task_id: task.id,
          play_sound: true
        },
      });
    }

    if (task.task_assignments && task.task_assignments.length > 0) {
      tasksToUpdate.push(task.id);
    }
  }

  await batchCreateNotifications(notificationsToCreate);

  if (tasksToUpdate.length > 0) {
    await supabase
      .from('tasks')
      .update({ notification_sent_at: new Date().toISOString() })
      .in('id', tasksToUpdate);
  }

  console.log(`✅ Created ${notificationsToCreate.length} task notifications`);
}

async function processPosts() {
  console.log('📱 Processing post notifications...');
  
  const now = new Date();
  const in3Hours = addHours(now, 3);
  const oneDayAgo = addHours(now, -24);

  // Query OTIMIZADA
  const { data: posts, error } = await supabase
    .from('social_media_posts')
    .select(`
      id,
      title,
      scheduled_date,
      agency_id,
      notification_sent_at,
      agencies!inner(
        agency_users(user_id)
      )
    `)
    .eq('archived', false)
    .gte('scheduled_date', now.toISOString())
    .lte('scheduled_date', in3Hours.toISOString())
    .or(`notification_sent_at.is.null,notification_sent_at.lt.${oneDayAgo.toISOString()}`);

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`📊 Found ${posts?.length || 0} posts to notify`);

  const notificationsToCreate: NotificationData[] = [];
  const postsToUpdate: string[] = [];

  for (const post of posts || []) {
    if (!post.agency_id) continue;

    const agencyUsers = (post.agencies as any)?.agency_users || [];
    
    for (const user of agencyUsers) {
      const canSend = await checkUserPreferences(user.user_id, post.agency_id, 'posts');
      if (!canSend) continue;

      notificationsToCreate.push({
        user_id: user.user_id,
        agency_id: post.agency_id,
        type: 'post',
        priority: 'medium',
        title: '📱 Post próximo de publicar',
        message: post.title || 'Post sem título',
        action_url: '/social-media',
        action_label: 'Ver post',
        metadata: { 
          post_id: post.id,
          play_sound: true
        },
      });
    }

    if (agencyUsers.length > 0) {
      postsToUpdate.push(post.id);
    }
  }

  await batchCreateNotifications(notificationsToCreate);

  if (postsToUpdate.length > 0) {
    await supabase
      .from('social_media_posts')
      .update({ notification_sent_at: new Date().toISOString() })
      .in('id', postsToUpdate);
  }

  console.log(`✅ Created ${notificationsToCreate.length} post notifications`);
}

async function processLeads() {
  console.log('🎯 Processing lead notifications...');
  
  const todayBrasilia = getTodayInBrasilia();
  const sevenDaysAgo = addDays(todayBrasilia, -7);
  const oneDayAgo = addDays(todayBrasilia, -1);

  // Query OTIMIZADA
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, assigned_to, agency_id, last_contact, follow_up_notification_sent_at')
    .not('assigned_to', 'is', null)
    .not('agency_id', 'is', null)
    .lte('last_contact', sevenDaysAgo.toISOString())
    .or(`follow_up_notification_sent_at.is.null,follow_up_notification_sent_at.lt.${oneDayAgo.toISOString()}`);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log(`📊 Found ${leads?.length || 0} leads to notify`);

  const notificationsToCreate: NotificationData[] = [];
  const leadsToUpdate: string[] = [];

  for (const lead of leads || []) {
    const canSend = await checkUserPreferences(lead.assigned_to!, lead.agency_id, 'leads');
    if (!canSend) continue;

    notificationsToCreate.push({
      user_id: lead.assigned_to!,
      agency_id: lead.agency_id,
      type: 'lead',
      priority: 'high',
      title: '🎯 Lead requer follow-up',
      message: `${lead.name} - sem contato há 7 dias`,
      action_url: '/crm',
      action_label: 'Ver lead',
      metadata: { 
        lead_id: lead.id,
        play_sound: true
      },
    });

    leadsToUpdate.push(lead.id);
  }

  await batchCreateNotifications(notificationsToCreate);

  if (leadsToUpdate.length > 0) {
    await supabase
      .from('leads')
      .update({ follow_up_notification_sent_at: new Date().toISOString() })
      .in('id', leadsToUpdate);
  }

  console.log(`✅ Created ${notificationsToCreate.length} lead notifications`);
}

async function processMeetings() {
  console.log('📅 Processing meeting notifications...');
  
  const now = new Date();
  const in1Hour = addHours(now, 1);

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id, title, start_time, organizer_id, participants, agency_id')
    .not('agency_id', 'is', null)
    .eq('status', 'scheduled')
    .gte('start_time', now.toISOString())
    .lte('start_time', in1Hour.toISOString());

  if (error) {
    console.error('Error fetching meetings:', error);
    return;
  }

  console.log(`📊 Found ${meetings?.length || 0} meetings to notify`);

  // Preparar batch check
  const trackingRecords: BatchTrackingRecord[] = [];
  meetings?.forEach(meeting => {
    trackingRecords.push({
      notification_type: 'meeting',
      entity_id: meeting.id,
      user_id: meeting.organizer_id,
      agency_id: meeting.agency_id
    });

    (meeting.participants as any[] || []).forEach((p: any) => {
      trackingRecords.push({
        notification_type: 'meeting',
        entity_id: meeting.id,
        user_id: p.user_id,
        agency_id: meeting.agency_id
      });
    });
  });

  // Verificar em batch quais já foram enviadas
  const recentlySent = await batchCheckNotifications(trackingRecords, 1);

  const notificationsToCreate: NotificationData[] = [];
  const toTrack: BatchTrackingRecord[] = [];

  for (const meeting of meetings || []) {
    // Organizer
    const orgKey = `${meeting.id}_${meeting.organizer_id}`;
    if (!recentlySent.has(orgKey)) {
      const canSend = await checkUserPreferences(meeting.organizer_id, meeting.agency_id, 'meetings');
      if (canSend) {
        notificationsToCreate.push({
          user_id: meeting.organizer_id,
          agency_id: meeting.agency_id,
          type: 'meeting',
          priority: 'high',
          title: '📅 Reunião em breve',
          message: meeting.title,
          action_url: '/agenda',
          action_label: 'Ver reunião',
          metadata: { meeting_id: meeting.id, play_sound: true },
        });
        toTrack.push({
          notification_type: 'meeting',
          entity_id: meeting.id,
          user_id: meeting.organizer_id,
          agency_id: meeting.agency_id
        });
      }
    }

    // Participants
    for (const participant of (meeting.participants as any[] || [])) {
      const partKey = `${meeting.id}_${participant.user_id}`;
      if (!recentlySent.has(partKey)) {
        const canSend = await checkUserPreferences(participant.user_id, meeting.agency_id, 'meetings');
        if (canSend) {
          notificationsToCreate.push({
            user_id: participant.user_id,
            agency_id: meeting.agency_id,
            type: 'meeting',
            priority: 'high',
            title: '📅 Reunião em breve',
            message: meeting.title,
            action_url: '/agenda',
            action_label: 'Ver reunião',
            metadata: { meeting_id: meeting.id, play_sound: true },
          });
          toTrack.push({
            notification_type: 'meeting',
            entity_id: meeting.id,
            user_id: participant.user_id,
            agency_id: meeting.agency_id
          });
        }
      }
    }
  }

  await batchCreateNotifications(notificationsToCreate);
  await batchTrackNotifications(toTrack);

  console.log(`✅ Created ${notificationsToCreate.length} meeting notifications`);
}

async function processPayments() {
  console.log('💰 Processing payment notifications...');
  
  const todayBrasilia = getTodayInBrasilia();
  const in3Days = addDays(todayBrasilia, 3);

  const { data: payments, error } = await supabase
    .from('client_payments')
    .select(`
      id,
      amount,
      due_date,
      agency_id,
      clients(name)
    `)
    .eq('status', 'pending')
    .lte('due_date', in3Days.toISOString())
    .not('agency_id', 'is', null);

  if (error) {
    console.error('Error fetching payments:', error);
    return;
  }

  console.log(`📊 Found ${payments?.length || 0} payments to notify`);

  // Get agency admins for each agency
  const agencyIds = [...new Set(payments?.map(p => p.agency_id) || [])];
  const adminsByAgency: Record<string, any[]> = {};

  for (const agencyId of agencyIds) {
    const { data: admins } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', agencyId)
      .in('role', ['owner', 'admin']);
    
    adminsByAgency[agencyId] = admins || [];
  }

  // Preparar batch check
  const trackingRecords: BatchTrackingRecord[] = [];
  payments?.forEach(payment => {
    const admins = adminsByAgency[payment.agency_id] || [];
    admins.forEach(admin => {
      trackingRecords.push({
        notification_type: 'payment',
        entity_id: payment.id,
        user_id: admin.user_id,
        agency_id: payment.agency_id
      });
    });
  });

  const recentlySent = await batchCheckNotifications(trackingRecords, 24);

  const notificationsToCreate: NotificationData[] = [];
  const toTrack: BatchTrackingRecord[] = [];

  for (const payment of payments || []) {
    const admins = adminsByAgency[payment.agency_id] || [];
    
    for (const admin of admins) {
      const key = `${payment.id}_${admin.user_id}`;
      if (!recentlySent.has(key)) {
        const canSend = await checkUserPreferences(admin.user_id, payment.agency_id, 'payments');
        if (canSend) {
          notificationsToCreate.push({
            user_id: admin.user_id,
            agency_id: payment.agency_id,
            type: 'payment',
            priority: 'high',
            title: '💰 Pagamento próximo do vencimento',
            message: `${(payment.clients as any)?.name || 'Cliente'} - R$ ${payment.amount}`,
            action_url: '/admin',
            action_label: 'Ver pagamento',
            metadata: { 
              payment_id: payment.id,
              play_sound: true
            },
          });
          toTrack.push({
            notification_type: 'payment',
            entity_id: payment.id,
            user_id: admin.user_id,
            agency_id: payment.agency_id
          });
        }
      }
    }
  }

  await batchCreateNotifications(notificationsToCreate);
  await batchTrackNotifications(toTrack);

  console.log(`✅ Created ${notificationsToCreate.length} payment notifications`);
}

// ============================================
// MAINTENANCE FUNCTION
// ============================================

async function cleanupOldTracking() {
  console.log('🧹 Cleaning up old notification tracking...');
  
  const thirtyDaysAgo = addDays(new Date(), -30);
  
  const { error } = await supabase
    .from('notification_tracking')
    .delete()
    .lt('last_sent_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('Error cleaning up tracking:', error);
  } else {
    console.log('✅ Old tracking records cleaned up');
  }
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting notification processing...');
    const startTime = Date.now();
    
    await Promise.all([
      processReminders(),
      processTasks(),
      processPosts(),
      processPayments(),
      processLeads(),
      processMeetings(),
    ]);

    // Executar limpeza em background (não bloqueia a resposta)
    cleanupOldTracking().catch(console.error);

    const duration = Date.now() - startTime;
    console.log(`✅ All notifications processed successfully in ${duration}ms`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notifications processed',
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error processing notifications:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});