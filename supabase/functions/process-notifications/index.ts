import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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

async function createNotification(data: NotificationData) {
  const { error } = await supabase
    .from('notifications')
    .insert(data);

  if (error) {
    console.error('Error creating notification:', error);
  }
}

async function processReminders() {
  console.log('Processing reminder notifications...');
  
  const now = new Date();
  const in1Hour = new Date(now.getTime() + 60 * 60000);

  // Get reminders that need notifications (stored in UTC)
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('completed', false)
    .eq('notification_enabled', true)
    .not('reminder_time', 'is', null)
    .lte('reminder_time', in1Hour.toISOString())
    .gte('reminder_time', now.toISOString());

  if (error) {
    console.error('Error fetching reminders:', error);
    return;
  }

  for (const reminder of reminders || []) {
    // Check if notification was already sent
    const reminderTime = new Date(reminder.reminder_time);
    const minutesBefore = reminder.notification_minutes_before || 0;
    const notificationTime = new Date(reminderTime.getTime() - minutesBefore * 60000);

    if (notificationTime <= now && (!reminder.last_notification_sent || new Date(reminder.last_notification_sent) < notificationTime)) {
      // Check user preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', reminder.user_id)
        .single();

      // Check do not disturb
      const doNotDisturbUntil = prefs?.do_not_disturb_until ? new Date(prefs.do_not_disturb_until) : null;
      if (doNotDisturbUntil && now < doNotDisturbUntil) {
        console.log(`User ${reminder.user_id} is in do not disturb mode, skipping notification`);
        continue;
      }

      // Check if reminders are enabled
      if (prefs && !prefs.reminders_enabled) {
        console.log(`Reminders disabled for user ${reminder.user_id}, skipping notification`);
        continue;
      }

      await createNotification({
        user_id: reminder.user_id,
        agency_id: reminder.agency_id,
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
      
      console.log(`Notification sent for reminder ${reminder.id}`);
    }
  }
}

async function processTasks() {
  console.log('Processing task notifications...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get tasks due today
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, task_assignments(user_id)')
    .eq('completed', false)
    .gte('due_date', today.toISOString())
    .lt('due_date', tomorrow.toISOString());

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  for (const task of tasks || []) {
    const assignments = task.task_assignments || [];
    
    for (const assignment of assignments) {
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
    }
  }
}

async function processPosts() {
  console.log('Processing post notifications...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get posts scheduled for today
  const { data: posts, error } = await supabase
    .from('social_media_posts')
    .select('*')
    .in('status', ['approved', 'scheduled'])
    .gte('scheduled_date', today.toISOString())
    .lt('scheduled_date', tomorrow.toISOString());

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  // Get all users in each agency
  for (const post of posts || []) {
    const { data: users } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', post.agency_id);

    for (const user of users || []) {
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
    }
  }
}

async function processPayments() {
  console.log('Processing payment notifications...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);

  // Get payments due in 3 days or overdue
  const { data: payments, error } = await supabase
    .from('client_payments')
    .select('*, clients(name)')
    .eq('status', 'pending')
    .lte('due_date', in3Days.toISOString());

  if (error) {
    console.error('Error fetching payments:', error);
    return;
  }

  for (const payment of payments || []) {
    const dueDate = new Date(payment.due_date);
    const isOverdue = dueDate < today;
    
    // Get agency admins
    const { data: admins } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', payment.agency_id)
      .in('role', ['owner', 'admin']);

    for (const admin of admins || []) {
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
    }
  }
}

async function processLeads() {
  console.log('Processing lead notifications...');
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get leads without follow-up for 7 days
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .not('status', 'in', '("won","lost")')
    .or(`last_contact.is.null,last_contact.lt.${sevenDaysAgo.toISOString()}`);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  for (const lead of leads || []) {
    if (lead.assigned_to) {
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
    }
  }
}

async function processMeetings() {
  console.log('Processing meeting notifications...');
  
  const now = new Date();
  const in1Hour = new Date(now.getTime() + 60 * 60000);

  // Get meetings in the next hour
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

  for (const meeting of meetings || []) {
    // Notify organizer
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

    // Notify participants
    const participants = meeting.participants || [];
    for (const participant of participants) {
      if (participant.user_id) {
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
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    console.log('Starting notification processing...');

    await Promise.all([
      processReminders(),
      processTasks(),
      processPosts(),
      processPayments(),
      processLeads(),
      processMeetings(),
    ]);

    console.log('Notification processing completed');

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications processed' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
