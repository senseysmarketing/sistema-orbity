import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { toZonedTime, fromZonedTime } from 'https://esm.sh/date-fns-tz@3.2.0';
import { addDays, addHours } from 'https://esm.sh/date-fns@3.6.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const TIMEZONE = 'America/Sao_Paulo';

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

// ============= TIMEZONE HELPERS =============

function getTodayInBrasilia(): Date {
  const nowUtc = new Date();
  const nowBrasilia = toZonedTime(nowUtc, TIMEZONE);
  nowBrasilia.setHours(0, 0, 0, 0);
  return nowBrasilia;
}

function getTomorrowInBrasilia(): Date {
  const today = getTodayInBrasilia();
  return addDays(today, 1);
}

function convertToBrasiliaTime(utcDate: Date): Date {
  return toZonedTime(utcDate, TIMEZONE);
}

// ============= NOTIFICATION HELPERS =============

async function createNotification(data: NotificationData) {
  const { error } = await supabase
    .from('notifications')
    .insert(data);

  if (error) {
    console.error('Error creating notification:', error);
  }
}

async function shouldSendNotification(
  type: string,
  entityId: string,
  userId: string,
  agencyId: string,
  minIntervalHours: number = 24
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_tracking')
    .select('last_sent_at')
    .eq('notification_type', type)
    .eq('entity_id', entityId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking notification tracking:', error);
    return true; // Send on error to be safe
  }

  if (!data) return true; // First time sending

  const lastSent = new Date(data.last_sent_at);
  const now = new Date();
  const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

  return hoursSince >= minIntervalHours;
}

async function trackNotification(
  type: string,
  entityId: string,
  userId: string,
  agencyId: string
) {
  const { error } = await supabase
    .from('notification_tracking')
    .upsert({
      notification_type: type,
      entity_id: entityId,
      user_id: userId,
      agency_id: agencyId,
      last_sent_at: new Date().toISOString()
    }, {
      onConflict: 'notification_type,entity_id,user_id'
    });

  if (error) {
    console.error('Error tracking notification:', error);
  }
}

async function checkUserPreferences(userId: string, preferenceType: string): Promise<{ 
  canSend: boolean; 
  reason?: string 
}> {
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Check do not disturb
  if (prefs?.do_not_disturb_until) {
    const dndUntil = new Date(prefs.do_not_disturb_until);
    if (new Date() < dndUntil) {
      return { canSend: false, reason: 'do_not_disturb' };
    }
  }

  // Check if notification type is enabled
  const prefKey = `${preferenceType}_enabled`;
  if (prefs && prefs[prefKey] === false) {
    return { canSend: false, reason: `${preferenceType}_disabled` };
  }

  return { canSend: true };
}

// ============= NOTIFICATION PROCESSORS =============

async function processReminders() {
  console.log(`[${new Date().toISOString()}] Processing reminder notifications...`);
  
  const now = new Date();
  const in2Hours = addHours(now, 2);

  // Buscar lembretes que devem notificar nas próximas 2 horas
  // Isso cobre lembretes com até 60 min de antecedência
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

  console.log(`Found ${reminders?.length || 0} reminders to process`);
  let sentCount = 0;
  let skippedCount = 0;

  for (const reminder of reminders || []) {
    const reminderTime = new Date(reminder.reminder_time);
    const minutesBefore = reminder.notification_minutes_before || 0;
    const notificationTime = new Date(reminderTime.getTime() - minutesBefore * 60000);

    // Verificar se já passou da hora de notificar e se ainda não foi enviada
    const alreadySent = reminder.last_notification_sent && new Date(reminder.last_notification_sent) >= notificationTime;
    
    if (notificationTime <= now && !alreadySent) {
      console.log(`Processing reminder ${reminder.id} - Notification time: ${notificationTime.toISOString()}, Reminder time: ${reminderTime.toISOString()}`);
      
      // Check user preferences
      const prefCheck = await checkUserPreferences(reminder.user_id, 'reminders');
      if (!prefCheck.canSend) {
        console.log(`Skipping reminder ${reminder.id}: ${prefCheck.reason}`);
        skippedCount++;
        continue;
      }

      // Get agency_id from reminder or from user's agency
      let agencyId = reminder.agency_id;
      if (!agencyId) {
        const { data: userAgency } = await supabase
          .from('agency_users')
          .select('agency_id')
          .eq('user_id', reminder.user_id)
          .single();
        agencyId = userAgency?.agency_id;
      }

      await createNotification({
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
          play_sound: true,
          notification_sound: reminder.notification_sound || 'default'
        },
      });

      // Update last notification sent
      await supabase
        .from('reminders')
        .update({ last_notification_sent: now.toISOString() })
        .eq('id', reminder.id);
      
      sentCount++;
      console.log(`✅ Notification sent for reminder ${reminder.id}`);
    } else if (alreadySent) {
      console.log(`⏭️ Reminder ${reminder.id} already sent at ${reminder.last_notification_sent}`);
    } else {
      console.log(`⏰ Reminder ${reminder.id} not ready yet - will notify at ${notificationTime.toISOString()}`);
    }
  }

  console.log(`Reminders: sent ${sentCount}, skipped ${skippedCount}`);
}

async function processTasks() {
  console.log(`[${new Date().toISOString()}] Processing task notifications...`);
  
  const todayBrasilia = getTodayInBrasilia();
  const tomorrowBrasilia = getTomorrowInBrasilia();

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, task_assignments(user_id)')
    .neq('status', 'completed')
    .gte('due_date', todayBrasilia.toISOString())
    .lt('due_date', tomorrowBrasilia.toISOString());

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  console.log(`Found ${tasks?.length || 0} tasks to process`);
  let sentCount = 0;
  let skippedCount = 0;

  for (const task of tasks || []) {
    const assignments = task.task_assignments || [];
    
    for (const assignment of assignments) {
      // Check deduplication
      const shouldSend = await shouldSendNotification(
        'task',
        task.id,
        assignment.user_id,
        task.agency_id,
        24 // Don't resend within 24 hours
      );

      if (!shouldSend) {
        console.log(`Skipping duplicate task notification ${task.id} for user ${assignment.user_id}`);
        skippedCount++;
        continue;
      }

      // Check user preferences
      const prefCheck = await checkUserPreferences(assignment.user_id, 'tasks');
      if (!prefCheck.canSend) {
        console.log(`Skipping task ${task.id}: ${prefCheck.reason}`);
        skippedCount++;
        continue;
      }

      await createNotification({
        user_id: assignment.user_id,
        agency_id: task.agency_id,
        type: 'task',
        priority: 'high',
        title: '📋 Tarefa para hoje',
        message: task.title,
        action_url: '/tasks',
        action_label: 'Ver tarefa',
        metadata: { task_id: task.id },
      });

      await trackNotification('task', task.id, assignment.user_id, task.agency_id);
      sentCount++;
      console.log(`Notification sent for task ${task.id} to user ${assignment.user_id}`);
    }
  }

  console.log(`Tasks: sent ${sentCount}, skipped ${skippedCount}`);
}

async function processPosts() {
  console.log(`[${new Date().toISOString()}] Processing post notifications...`);
  
  const todayBrasilia = getTodayInBrasilia();
  const tomorrowBrasilia = getTomorrowInBrasilia();

  const { data: posts, error } = await supabase
    .from('social_media_posts')
    .select('*')
    .in('status', ['approved', 'scheduled'])
    .gte('scheduled_date', todayBrasilia.toISOString())
    .lt('scheduled_date', tomorrowBrasilia.toISOString());

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Found ${posts?.length || 0} posts to process`);
  let sentCount = 0;
  let skippedCount = 0;

  for (const post of posts || []) {
    const { data: users } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', post.agency_id);

    for (const user of users || []) {
      // Check deduplication
      const shouldSend = await shouldSendNotification(
        'post',
        post.id,
        user.user_id,
        post.agency_id,
        24
      );

      if (!shouldSend) {
        console.log(`Skipping duplicate post notification ${post.id} for user ${user.user_id}`);
        skippedCount++;
        continue;
      }

      // Check user preferences
      const prefCheck = await checkUserPreferences(user.user_id, 'posts');
      if (!prefCheck.canSend) {
        console.log(`Skipping post ${post.id}: ${prefCheck.reason}`);
        skippedCount++;
        continue;
      }

      await createNotification({
        user_id: user.user_id,
        agency_id: post.agency_id,
        type: 'post',
        priority: 'medium',
        title: '📱 Post programado para hoje',
        message: post.title || 'Post sem título',
        action_url: '/social-media',
        action_label: 'Ver post',
        metadata: { post_id: post.id },
      });

      await trackNotification('post', post.id, user.user_id, post.agency_id);
      sentCount++;
      console.log(`Notification sent for post ${post.id} to user ${user.user_id}`);
    }
  }

  console.log(`Posts: sent ${sentCount}, skipped ${skippedCount}`);
}

async function processPayments() {
  console.log(`[${new Date().toISOString()}] Processing payment notifications...`);
  
  const todayBrasilia = getTodayInBrasilia();
  const in3Days = addDays(todayBrasilia, 3);

  const { data: payments, error } = await supabase
    .from('client_payments')
    .select('*, clients(name)')
    .eq('status', 'pending')
    .lte('due_date', in3Days.toISOString());

  if (error) {
    console.error('Error fetching payments:', error);
    return;
  }

  console.log(`Found ${payments?.length || 0} payments to process`);
  let sentCount = 0;
  let skippedCount = 0;

  for (const payment of payments || []) {
    const dueDate = new Date(payment.due_date);
    const isOverdue = dueDate < todayBrasilia;
    
    const { data: admins } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', payment.agency_id)
      .in('role', ['owner', 'admin']);

    for (const admin of admins || []) {
      // Different intervals for overdue vs upcoming
      const minInterval = isOverdue ? 12 : 24;
      
      const shouldSend = await shouldSendNotification(
        'payment',
        payment.id,
        admin.user_id,
        payment.agency_id,
        minInterval
      );

      if (!shouldSend) {
        console.log(`Skipping duplicate payment notification ${payment.id} for user ${admin.user_id}`);
        skippedCount++;
        continue;
      }

      const prefCheck = await checkUserPreferences(admin.user_id, 'payments');
      if (!prefCheck.canSend) {
        console.log(`Skipping payment ${payment.id}: ${prefCheck.reason}`);
        skippedCount++;
        continue;
      }

      await createNotification({
        user_id: admin.user_id,
        agency_id: payment.agency_id,
        type: 'payment',
        priority: isOverdue ? 'urgent' : 'high',
        title: isOverdue ? '💸 Pagamento em atraso' : '💰 Pagamento próximo',
        message: `${payment.clients?.name || 'Cliente'} - R$ ${payment.amount}`,
        action_url: '/admin',
        action_label: 'Ver pagamento',
        metadata: { payment_id: payment.id },
      });

      await trackNotification('payment', payment.id, admin.user_id, payment.agency_id);
      sentCount++;
      console.log(`Notification sent for payment ${payment.id} to admin ${admin.user_id}`);
    }
  }

  console.log(`Payments: sent ${sentCount}, skipped ${skippedCount}`);
}

async function processLeads() {
  console.log(`[${new Date().toISOString()}] Processing lead notifications...`);
  
  const sevenDaysAgo = addDays(new Date(), -7);

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .not('status', 'in', '("won","lost")')
    .or(`last_contact.is.null,last_contact.lt.${sevenDaysAgo.toISOString()}`);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log(`Found ${leads?.length || 0} leads to process`);
  let sentCount = 0;
  let skippedCount = 0;

  for (const lead of leads || []) {
    if (!lead.assigned_to) continue;

    const shouldSend = await shouldSendNotification(
      'lead',
      lead.id,
      lead.assigned_to,
      lead.agency_id,
      24
    );

    if (!shouldSend) {
      console.log(`Skipping duplicate lead notification ${lead.id}`);
      skippedCount++;
      continue;
    }

    const prefCheck = await checkUserPreferences(lead.assigned_to, 'leads');
    if (!prefCheck.canSend) {
      console.log(`Skipping lead ${lead.id}: ${prefCheck.reason}`);
      skippedCount++;
      continue;
    }

    await createNotification({
      user_id: lead.assigned_to,
      agency_id: lead.agency_id,
      type: 'lead',
      priority: lead.priority === 'high' ? 'high' : 'medium',
      title: '🎯 Lead precisa de follow-up',
      message: `${lead.name} - sem contato há 7 dias`,
      action_url: '/crm',
      action_label: 'Ver lead',
      metadata: { lead_id: lead.id },
    });

    await trackNotification('lead', lead.id, lead.assigned_to, lead.agency_id);
    sentCount++;
    console.log(`Notification sent for lead ${lead.id}`);
  }

  console.log(`Leads: sent ${sentCount}, skipped ${skippedCount}`);
}

async function processMeetings() {
  console.log(`[${new Date().toISOString()}] Processing meeting notifications...`);
  
  const now = new Date();
  const in1Hour = addHours(now, 1);

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('status', 'scheduled')
    .gte('start_time', now.toISOString())
    .lte('start_time', in1Hour.toISOString());

  if (error) {
    console.error('Error fetching meetings:', error);
    return;
  }

  console.log(`Found ${meetings?.length || 0} meetings to process`);
  let sentCount = 0;
  let skippedCount = 0;

  for (const meeting of meetings || []) {
    // Notify organizer
    const shouldSendOrganizer = await shouldSendNotification(
      'meeting',
      meeting.id,
      meeting.organizer_id,
      meeting.agency_id,
      2 // Can notify again 2 hours later if still upcoming
    );

    if (shouldSendOrganizer) {
      const prefCheck = await checkUserPreferences(meeting.organizer_id, 'meetings');
      
      if (prefCheck.canSend) {
        await createNotification({
          user_id: meeting.organizer_id,
          agency_id: meeting.agency_id,
          type: 'meeting',
          priority: 'high',
          title: '📅 Reunião em 1 hora',
          message: meeting.title,
          action_url: '/agenda',
          action_label: 'Ver reunião',
          metadata: { meeting_id: meeting.id },
        });

        await trackNotification('meeting', meeting.id, meeting.organizer_id, meeting.agency_id);
        sentCount++;
        console.log(`Notification sent for meeting ${meeting.id} to organizer`);
      } else {
        skippedCount++;
      }
    } else {
      skippedCount++;
    }

    // Notify participants
    const participants = meeting.participants || [];
    for (const participant of participants) {
      if (!participant.user_id) continue;

      const shouldSendParticipant = await shouldSendNotification(
        'meeting',
        meeting.id,
        participant.user_id,
        meeting.agency_id,
        2
      );

      if (!shouldSendParticipant) {
        skippedCount++;
        continue;
      }

      const prefCheck = await checkUserPreferences(participant.user_id, 'meetings');
      if (!prefCheck.canSend) {
        console.log(`Skipping meeting ${meeting.id} for participant: ${prefCheck.reason}`);
        skippedCount++;
        continue;
      }

      await createNotification({
        user_id: participant.user_id,
        agency_id: meeting.agency_id,
        type: 'meeting',
        priority: 'high',
        title: '📅 Reunião em 1 hora',
        message: meeting.title,
        action_url: '/agenda',
        action_label: 'Ver reunião',
        metadata: { meeting_id: meeting.id },
      });

      await trackNotification('meeting', meeting.id, participant.user_id, meeting.agency_id);
      sentCount++;
      console.log(`Notification sent for meeting ${meeting.id} to participant ${participant.user_id}`);
    }
  }

  console.log(`Meetings: sent ${sentCount}, skipped ${skippedCount}`);
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  try {
    console.log(`\n========== NOTIFICATION PROCESSING STARTED: ${new Date().toISOString()} ==========`);
    console.log(`Timezone: ${TIMEZONE}`);
    console.log(`Today in Brasilia: ${getTodayInBrasilia().toISOString()}`);

    await Promise.all([
      processReminders(),
      processTasks(),
      processPosts(),
      processPayments(),
      processLeads(),
      processMeetings(),
    ]);

    console.log('========== NOTIFICATION PROCESSING COMPLETED ==========\n');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notifications processed',
        timestamp: new Date().toISOString(),
        timezone: TIMEZONE
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('========== ERROR PROCESSING NOTIFICATIONS ==========');
    console.error(error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});