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
  entity_type?: string;
  entity_id?: string;
  action_type?: string;
}

interface BatchTrackingRecord {
  notification_type: string;
  entity_id: string;
  user_id: string;
  agency_id: string;
}

// ============================================
// PROCESS LOCK - Prevent parallel executions
// ============================================

const LOCK_DURATION_MS = 30000; // 30 seconds
const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';

// Generate a deterministic UUID from a string (UUID v5-like)
function stringToUUID(str: string): string {
  let hash1 = 0;
  let hash2 = 0;
  let hash3 = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1 + char) | 0;
    hash2 = ((hash2 << 7) - hash2 + char) | 0;
    hash3 = ((hash3 << 11) - hash3 + char) | 0;
  }
  
  const hex1 = Math.abs(hash1).toString(16).padStart(8, '0').slice(-8);
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0').slice(-8);
  const hex3 = Math.abs(hash3).toString(16).padStart(8, '0').slice(-8);
  
  // Format as UUID v4 (but deterministic): xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx
  return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(5, 8)}-8${hex3.slice(1, 4)}-${hex3.slice(4)}${hex1.slice(0, 4)}${hex2.slice(0, 4)}`;
}

async function acquireProcessLock(lockName: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const lockKeyString = `${lockName}_${today}`;
  const lockKey = stringToUUID(lockKeyString);
  
  console.log(`🔐 Lock attempt: '${lockKeyString}' → UUID: ${lockKey}`);
  
  try {
    const { data: existingLock, error: selectError } = await supabase
      .from('notification_tracking')
      .select('last_sent_at')
      .eq('notification_type', 'process_lock')
      .eq('entity_id', lockKey)
      .eq('user_id', SYSTEM_UUID)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows found (expected for first run)
      console.warn(`⚠️ Lock select error for '${lockName}':`, selectError.message);
      // On error, proceed with execution to avoid blocking
      return true;
    }

    if (existingLock) {
      const lastRun = new Date(existingLock.last_sent_at);
      const timeSinceLastRun = Date.now() - lastRun.getTime();
      
      if (timeSinceLastRun < LOCK_DURATION_MS) {
        console.log(`🔒 Lock '${lockName}' still active (${Math.round(timeSinceLastRun / 1000)}s ago) - skipping`);
        return false;
      }
    }

    // Acquire lock
    const { error: upsertError } = await supabase.from('notification_tracking').upsert({
      notification_type: 'process_lock',
      entity_id: lockKey,
      user_id: SYSTEM_UUID,
      agency_id: SYSTEM_UUID,
      last_sent_at: new Date().toISOString()
    }, { onConflict: 'notification_type,entity_id,user_id' });

    if (upsertError) {
      console.warn(`⚠️ Lock upsert error for '${lockName}':`, upsertError.message);
      // On error, proceed with execution to avoid blocking all notifications
      return true;
    }

    console.log(`🔓 Lock '${lockName}' acquired successfully`);
    return true;
  } catch (err) {
    console.error(`❌ Lock exception for '${lockName}':`, err);
    // On any exception, proceed to avoid blocking
    return true;
  }
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

  // Use individual inserts with ON CONFLICT handling for deduplication
  let created = 0;
  for (const notification of notifications) {
    const { error } = await supabase
      .from('notifications')
      .insert(notification);

    if (error) {
      // Check if it's a unique constraint violation (duplicate)
      if (error.code === '23505') {
        console.log(`⏭️ Duplicate notification skipped: ${notification.entity_type}/${notification.entity_id}/${notification.action_type}`);
        continue;
      }
      console.error('Error creating notification:', error);
      continue;
    }
    created++;
  }

  console.log(`[Notifications] ${created}/${notifications.length} notificações criadas (push será enviado via trigger)`);
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
  let { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .maybeSingle();

  // Fallback: usa preferências por usuário (sem agência) se não houver registro por agência
  if (!preferences) {
    const { data: userOnlyPrefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    preferences = userOnlyPrefs as any;
  }

  if (!preferences) return true;

  const typeEnabled = {
    'reminders': preferences.reminders_enabled,
    'tasks': preferences.tasks_enabled,
    'posts': preferences.posts_enabled,
    'payments': preferences.payments_enabled,
    'leads': preferences.leads_enabled,
    'meetings': preferences.meetings_enabled,
    'expenses': preferences.expenses_enabled,
    'system': preferences.system_enabled,
  }[notificationType];

  if (typeEnabled === false) return false;

  // Check do not disturb until timestamp
  if (preferences.do_not_disturb_until && new Date(preferences.do_not_disturb_until) > new Date()) {
    return false;
  }

  // Check do not disturb time range
  if (preferences.dnd_start_time && preferences.dnd_end_time) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    if (currentTime >= preferences.dnd_start_time && currentTime <= preferences.dnd_end_time) {
      return false;
    }
  }

  // Check weekends
  if (preferences.dnd_weekends) {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
  }

  return true;
}

async function getUserPreferences(userId: string, agencyId: string) {
  let { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (!data) {
    const { data: userOnly } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    data = userOnly as any;
  }
  
  return data;
}

// ============================================
// NOTIFICATION PROCESSORS
// ============================================

async function processReminders() {
  console.log('⏰ Processing reminder notifications...');
  
  const now = new Date();

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('completed', false)
    .eq('notification_enabled', true)
    .not('reminder_time', 'is', null);

  if (error) {
    console.error('Error fetching reminders:', error);
    return;
  }

  console.log(`📊 Found ${reminders?.length || 0} reminders to process`);

  const notificationsToCreate: NotificationData[] = [];
  const remindersToUpdate: { id: string; last_notification_sent: string }[] = [];

  for (const reminder of reminders || []) {
    let agencyId = reminder.agency_id;
    if (!agencyId) {
      const { data: userAgency } = await supabase
        .from('agency_users')
        .select('agency_id')
        .eq('user_id', reminder.user_id)
        .single();
      agencyId = userAgency?.agency_id;
    }

    // Get user preferences for advance time
    const prefs = await getUserPreferences(reminder.user_id, agencyId);
    const advanceMinutes = prefs?.reminder_advance_minutes ?? 120;
    
    const reminderTime = new Date(reminder.reminder_time);
    const customMinutesBefore = reminder.notification_minutes_before ?? advanceMinutes;
    const notificationTime = new Date(reminderTime.getTime() - customMinutesBefore * 60000);

    const alreadySent = reminder.last_notification_sent && 
      new Date(reminder.last_notification_sent) >= notificationTime;
    
    if (notificationTime <= now && !alreadySent) {
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
        entity_type: 'reminder',
        entity_id: reminder.id,
        action_type: 'reminder',
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
  const oneDayAgo = addHours(now, -24);

  // Get all incomplete tasks
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
    .or(`notification_sent_at.is.null,notification_sent_at.lt.${oneDayAgo.toISOString()}`);

  if (error) {
    console.error('Error fetching tasks:', error);
    return;
  }

  console.log(`📊 Found ${tasks?.length || 0} tasks to notify`);

  // Build list of potential notifications with user+task deduplication
  const potentialNotifications: { notification: NotificationData; tracking: BatchTrackingRecord }[] = [];
  const tasksToUpdate: string[] = [];

  for (const task of tasks || []) {
    if (!task.agency_id) continue;

    for (const assignment of task.task_assignments || []) {
      // Get user preferences for advance time
      const prefs = await getUserPreferences(assignment.user_id, task.agency_id);
      const advanceHours = prefs?.task_advance_hours ?? 24;
      
      const dueDate = new Date(task.due_date);
      const notificationTime = addHours(now, advanceHours);
      
      // Only notify if within the advance window
      if (dueDate <= notificationTime) {
        const canSend = await checkUserPreferences(assignment.user_id, task.agency_id, 'tasks');
        if (!canSend) continue;

        potentialNotifications.push({
          notification: {
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
            entity_type: 'task',
            entity_id: task.id,
            action_type: 'upcoming',
          },
          tracking: {
            notification_type: 'task_upcoming',
            entity_id: task.id,
            user_id: assignment.user_id,
            agency_id: task.agency_id,
          }
        });
      }
    }

    if (task.task_assignments && task.task_assignments.length > 0) {
      tasksToUpdate.push(task.id);
    }
  }

  // Batch check which notifications were already sent (dedupe by user+task)
  const trackingRecords = potentialNotifications.map(p => p.tracking);
  const recentlySent = await batchCheckNotifications(trackingRecords, 24);

  // Filter out already sent notifications
  const filteredNotifications = potentialNotifications.filter(p => {
    const key = `${p.tracking.entity_id}_${p.tracking.user_id}`;
    const alreadySent = recentlySent.has(key);
    if (alreadySent) {
      console.log(`⏭️ Skipping task ${p.tracking.entity_id} for user ${p.tracking.user_id} - already notified`);
    }
    return !alreadySent;
  });

  // Create notifications and track them
  const notificationsToCreate = filteredNotifications.map(p => p.notification);
  const toTrack = filteredNotifications.map(p => p.tracking);

  await batchCreateNotifications(notificationsToCreate);
  await batchTrackNotifications(toTrack);

  if (tasksToUpdate.length > 0) {
    await supabase
      .from('tasks')
      .update({ notification_sent_at: new Date().toISOString() })
      .in('id', tasksToUpdate);
  }

  console.log(`✅ Created ${notificationsToCreate.length} task notifications (filtered from ${potentialNotifications.length})`);
}

async function processPosts() {
  console.log('📱 Processing social media task notifications...');
  
  const now = new Date();
  const oneDayAgo = addHours(now, -24);

  // Get all upcoming social media tasks - uses post_date with fallback to due_date
  const POST_ADVANCE_HOURS = 1;
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      post_date,
      due_date,
      agency_id,
      created_by,
      notification_sent_at,
      task_assignments(user_id)
    `)
    .eq('task_type', 'redes_sociais')
    .eq('archived', false)
    .or(`notification_sent_at.is.null,notification_sent_at.lt.${oneDayAgo.toISOString()}`);

  if (error) {
    console.error('Error fetching social media tasks:', error);
    return;
  }

  // Filter tasks with future publication date
  const upcomingTasks = (tasks || []).filter(task => {
    const postDate = task.post_date || task.due_date;
    return postDate && new Date(postDate) >= now;
  });

  console.log(`📊 Found ${upcomingTasks.length} social media tasks to notify`);

  const potentialNotifications: { notification: NotificationData; tracking: BatchTrackingRecord }[] = [];
  const tasksToUpdate: string[] = [];

  for (const task of upcomingTasks) {
    if (!task.agency_id) continue;

    const assignedUserIds = ((task as any).task_assignments || []).map((a: any) => a.user_id);

    const recipientSet = new Set<string>();
    if ((task as any).created_by) {
      recipientSet.add((task as any).created_by);
    }
    for (const userId of assignedUserIds) {
      recipientSet.add(userId);
    }

    const recipients = Array.from(recipientSet);
    
    const postDate = new Date(task.post_date || task.due_date);
    const notificationTime = addHours(now, POST_ADVANCE_HOURS);
    
    for (const userId of recipients) {
      if (postDate <= notificationTime) {
        const canSend = await checkUserPreferences(userId, task.agency_id, 'posts');
        if (!canSend) continue;

        potentialNotifications.push({
          notification: {
            user_id: userId,
            agency_id: task.agency_id,
            type: 'post',
            priority: 'medium',
            title: '📱 Post próximo de publicar',
            message: task.title || 'Post sem título',
            action_url: '/social-media',
            action_label: 'Ver post',
            metadata: { 
              task_id: task.id,
              play_sound: true
            },
            entity_type: 'post',
            entity_id: task.id,
            action_type: 'upcoming',
          },
          tracking: {
            notification_type: 'post_upcoming',
            entity_id: task.id,
            user_id: userId,
            agency_id: task.agency_id,
          }
        });
      }
    }

    if (recipients.length > 0) {
      tasksToUpdate.push(task.id);
    }
  }

  const trackingRecords = potentialNotifications.map(p => p.tracking);
  const recentlySent = await batchCheckNotifications(trackingRecords, 24);

  const filteredNotifications = potentialNotifications.filter(p => {
    const key = `${p.tracking.entity_id}_${p.tracking.user_id}`;
    const alreadySent = recentlySent.has(key);
    if (alreadySent) {
      console.log(`⏭️ Skipping task ${p.tracking.entity_id} for user ${p.tracking.user_id} - already notified`);
    }
    return !alreadySent;
  });

  const notificationsToCreate = filteredNotifications.map(p => p.notification);
  const toTrack = filteredNotifications.map(p => p.tracking);

  await batchCreateNotifications(notificationsToCreate);
  await batchTrackNotifications(toTrack);

  if (tasksToUpdate.length > 0) {
    await supabase
      .from('tasks')
      .update({ notification_sent_at: new Date().toISOString() })
      .in('id', tasksToUpdate);
  }

  console.log(`✅ Created ${notificationsToCreate.length} social media task notifications (filtered from ${potentialNotifications.length})`);
}

async function processLeads() {
  console.log('🎯 Processing lead notifications...');
  
  const todayBrasilia = getTodayInBrasilia();
  const oneDayAgo = addDays(todayBrasilia, -1);

  // Get all leads with contacts
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, assigned_to, agency_id, last_contact, follow_up_notification_sent_at')
    .not('assigned_to', 'is', null)
    .not('agency_id', 'is', null)
    .or(`follow_up_notification_sent_at.is.null,follow_up_notification_sent_at.lt.${oneDayAgo.toISOString()}`);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log(`📊 Found ${leads?.length || 0} leads to notify`);

  const notificationsToCreate: NotificationData[] = [];
  const leadsToUpdate: string[] = [];

  for (const lead of leads || []) {
    // Get user preferences for inactive days
    const prefs = await getUserPreferences(lead.assigned_to!, lead.agency_id);
    const inactiveDays = prefs?.lead_inactive_days ?? 7;
    
    const inactiveThreshold = addDays(todayBrasilia, -inactiveDays);
    const lastContact = new Date(lead.last_contact);
    
    // Only notify if past the inactive threshold
    if (lastContact <= inactiveThreshold) {
      const canSend = await checkUserPreferences(lead.assigned_to!, lead.agency_id, 'leads');
      if (!canSend) continue;

      notificationsToCreate.push({
        user_id: lead.assigned_to!,
        agency_id: lead.agency_id,
        type: 'lead',
        priority: 'high',
        title: '🎯 Lead requer follow-up',
        message: `${lead.name} - sem contato há ${inactiveDays} dias`,
        action_url: '/crm',
        action_label: 'Ver lead',
        metadata: { 
          lead_id: lead.id,
          play_sound: true
        },
        entity_type: 'lead',
        entity_id: lead.id,
        action_type: 'follow_up',
      });

      leadsToUpdate.push(lead.id);
    }
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

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id, title, start_time, organizer_id, participants, agency_id, meeting_link')
    .not('agency_id', 'is', null)
    .eq('status', 'scheduled')
    .gte('start_time', now.toISOString());

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
  const recentlySent = await batchCheckNotifications(trackingRecords, 24);

  const notificationsToCreate: NotificationData[] = [];
  const toTrack: BatchTrackingRecord[] = [];

  for (const meeting of meetings || []) {
    // Get organizer preferences for advance time
    const orgPrefs = await getUserPreferences(meeting.organizer_id, meeting.agency_id);
    const advanceMinutes = orgPrefs?.meeting_advance_minutes ?? 60;
    
    const startTime = new Date(meeting.start_time);
    const notificationTime = new Date(startTime.getTime() - advanceMinutes * 60000);
    
    // Only notify if within the advance window
    if (now >= notificationTime) {
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
            metadata: { meeting_id: meeting.id, play_sound: true, meeting_link: (meeting as any).meeting_link || null },
            entity_type: 'meeting',
            entity_id: meeting.id,
            action_type: 'reminder',
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
              metadata: { meeting_id: meeting.id, play_sound: true, meeting_link: (meeting as any).meeting_link || null },
              entity_type: 'meeting',
              entity_id: meeting.id,
              action_type: 'reminder',
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
  }

  await batchCreateNotifications(notificationsToCreate);
  await batchTrackNotifications(toTrack);

  console.log(`✅ Created ${notificationsToCreate.length} meeting notifications`);
}

async function processExpenses() {
  console.log('💸 Processing expense notifications...');
  
  const now = new Date();
  
  // Get all expenses from database
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('status', 'pending')
    .not('agency_id', 'is', null);

  if (error) {
    console.error('Error fetching expenses:', error);
    return;
  }

  console.log(`📊 Found ${expenses?.length || 0} expenses to notify`);

  // Get agency admins for all agencies with expenses
  const agencyIds = [...new Set(expenses?.map(e => e.agency_id) || [])];
  const adminsByAgency: Record<string, any[]> = {};

  for (const agencyId of agencyIds) {
    const { data: admins } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', agencyId)
      .in('role', ['owner', 'admin']);
    
    adminsByAgency[agencyId] = admins || [];
  }

  // Prepare batch tracking check
  const trackingRecords: BatchTrackingRecord[] = [];
  expenses?.forEach(expense => {
    const admins = adminsByAgency[expense.agency_id] || [];
    admins.forEach(admin => {
      trackingRecords.push({
        notification_type: 'expense',
        entity_id: expense.id,
        user_id: admin.user_id,
        agency_id: expense.agency_id
      });
    });
  });

  // Check which notifications were recently sent
  const recentlySent = await batchCheckNotifications(trackingRecords, 24);

  const notificationsToCreate: NotificationData[] = [];
  const toTrack: BatchTrackingRecord[] = [];

  for (const expense of expenses || []) {
    const admins = adminsByAgency[expense.agency_id] || [];
    
    for (const admin of admins) {
      // Check if already sent recently
      const key = `${expense.id}_${admin.user_id}`;
      if (recentlySent.has(key)) {
        console.log(`⏭️ Skipping expense ${expense.id} for user ${admin.user_id} - already notified`);
        continue;
      }

      // Check user preferences
      const canSend = await checkUserPreferences(admin.user_id, expense.agency_id, 'expenses');
      if (!canSend) continue;

      const prefs = await getUserPreferences(admin.user_id, expense.agency_id);
      const advanceDays = prefs?.expense_advance_days ?? 3;
      
      const dueDate = new Date(expense.due_date);
      const notificationTime = addDays(dueDate, -advanceDays);
      
      // Check if in notification window
      const isInAdvanceWindow = now >= notificationTime && now < dueDate;
      const isPastDue = now >= dueDate;
      
      console.log(`🔍 Expense ${expense.id}: due=${dueDate.toISOString()}, notifyAt=${notificationTime.toISOString()}, now=${now.toISOString()}`);
      console.log(`📊 In window: ${isInAdvanceWindow}, Past due: ${isPastDue}`);
      
      if (!isInAdvanceWindow && !isPastDue) continue;

      const priority = isPastDue ? 'urgent' : 'medium';
      const title = isPastDue 
        ? '🚨 Despesa ATRASADA' 
        : '💸 Despesa próxima do vencimento';

      notificationsToCreate.push({
        user_id: admin.user_id,
        agency_id: expense.agency_id,
        type: 'expense',
        priority: priority,
        title: title,
        message: `${expense.name} - R$ ${expense.amount}`,
        action_url: '/admin',
        action_label: 'Ver despesa',
        metadata: { 
          expense_id: expense.id,
          play_sound: true,
          is_overdue: isPastDue
        },
      });

      toTrack.push({
        notification_type: 'expense',
        entity_id: expense.id,
        user_id: admin.user_id,
        agency_id: expense.agency_id
      });
    }
  }

  await batchCreateNotifications(notificationsToCreate);
  await batchTrackNotifications(toTrack);

  console.log(`✅ Created ${notificationsToCreate.length} expense notifications`);
}

async function processPayments() {
  console.log('💰 Processing payment notifications...');
  
  const now = new Date();
  
  // Get all payments from database
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
    .not('agency_id', 'is', null);

  if (error) {
    console.error('Error fetching payments:', error);
    return;
  }

  console.log(`📊 Found ${payments?.length || 0} payments to notify`);

  // Get agency admins for all agencies with payments
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

  // Prepare batch tracking check
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

  // Check which notifications were recently sent
  const recentlySent = await batchCheckNotifications(trackingRecords, 24);

  const notificationsToCreate: NotificationData[] = [];
  const toTrack: BatchTrackingRecord[] = [];

  for (const payment of payments || []) {
    const admins = adminsByAgency[payment.agency_id] || [];
    
    for (const admin of admins) {
      // Check if already sent recently
      const key = `${payment.id}_${admin.user_id}`;
      if (recentlySent.has(key)) {
        console.log(`⏭️ Skipping payment ${payment.id} for user ${admin.user_id} - already notified`);
        continue;
      }

      // Check user preferences
      const canSend = await checkUserPreferences(admin.user_id, payment.agency_id, 'payments');
      if (!canSend) continue;

      const prefs = await getUserPreferences(admin.user_id, payment.agency_id);
      const advanceDays = prefs?.payment_advance_days ?? 3;
      const repeatEnabled = prefs?.payment_repeat_enabled ?? false;
      const repeatDays = prefs?.payment_repeat_days ?? 1;
      
      const dueDate = new Date(payment.due_date);
      const notificationTime = addDays(dueDate, -advanceDays);
      
      // Check if in notification window
      const isInAdvanceWindow = now >= notificationTime && now < dueDate;
      const isPastDue = now >= dueDate;
      
      console.log(`🔍 Payment ${payment.id}: due=${dueDate.toISOString()}, notifyAt=${notificationTime.toISOString()}, now=${now.toISOString()}`);
      console.log(`📊 In window: ${isInAdvanceWindow}, Past due: ${isPastDue}`);
      
      if (!isInAdvanceWindow && !isPastDue) continue;

      // For overdue payments, check repeat settings
      if (isPastDue && !repeatEnabled) {
        console.log(`⏭️ Skipping overdue payment ${payment.id} - repeat not enabled`);
        continue;
      }

      const priority = isPastDue ? 'urgent' : 'high';
      const title = isPastDue 
        ? '🚨 Pagamento ATRASADO' 
        : '💰 Pagamento próximo do vencimento';

      notificationsToCreate.push({
        user_id: admin.user_id,
        agency_id: payment.agency_id,
        type: 'payment',
        priority: priority,
        title: title,
        message: `${(payment.clients as any)?.name || 'Cliente'} - R$ ${payment.amount}`,
        action_url: '/admin',
        action_label: 'Ver pagamento',
        metadata: { 
          payment_id: payment.id,
          play_sound: true,
          is_overdue: isPastDue
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

  await batchCreateNotifications(notificationsToCreate);
  await batchTrackNotifications(toTrack);

  console.log(`✅ Created ${notificationsToCreate.length} payment notifications`);
}

// ============================================
// MAINTENANCE FUNCTIONS
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

async function archiveReadNotifications() {
  console.log('📦 Archiving read notifications...');
  
  const oneHourAgo = addHours(new Date(), -1);
  
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_archived: true })
    .eq('is_read', true)
    .eq('is_archived', false)
    .not('read_at', 'is', null)
    .lt('read_at', oneHourAgo.toISOString())
    .select('id');

  if (error) {
    console.error('Error archiving notifications:', error);
  } else {
    console.log(`✅ Archived ${data?.length || 0} read notifications`);
  }
}

async function processDailySummary() {
  console.log('📊 Processing daily summary notifications (personalized per user)...');
  
  const todayBrasilia = getTodayInBrasilia();
  const endOfDayBrasilia = new Date(todayBrasilia);
  endOfDayBrasilia.setHours(23, 59, 59, 999);

  // Get all agencies
  const { data: agencies, error: agenciesError } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('is_active', true);

  if (agenciesError) {
    console.error('Error fetching agencies:', agenciesError);
    return;
  }

  console.log(`📊 Processing daily summary for ${agencies?.length || 0} agencies`);

  const notificationsToCreate: NotificationData[] = [];
  const trackingToCreate: BatchTrackingRecord[] = [];

  for (const agency of agencies || []) {
    // Get all agency users first
    const { data: agencyUsers } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', agency.id);

    if (!agencyUsers || agencyUsers.length === 0) {
      console.log(`⏭️ Agency ${agency.id} has no users - skipping`);
      continue;
    }

    // Process each user individually with their own counts
    for (const user of agencyUsers) {
      const canSend = await checkUserPreferences(user.user_id, agency.id, 'system');
      if (!canSend) {
        console.log(`⏭️ User ${user.user_id} has notifications disabled - skipping`);
        continue;
      }

      // Count tasks assigned to THIS USER due today
      const { count: userTasksCount, error: tasksError } = await supabase
        .from('task_assignments')
        .select(`
          task_id,
          tasks!inner(
            id,
            due_date,
            status,
            archived,
            agency_id
          )
        `, { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .eq('tasks.agency_id', agency.id)
        .eq('tasks.archived', false)
        .neq('tasks.status', 'done')
        .gte('tasks.due_date', todayBrasilia.toISOString())
        .lte('tasks.due_date', endOfDayBrasilia.toISOString());

      if (tasksError) {
        console.error(`Error counting tasks for user ${user.user_id}:`, tasksError);
      }

      // Count social media tasks assigned to THIS USER for today
      const { count: userPostsCount, error: postsError } = await supabase
        .from('task_assignments')
        .select(`
          task_id,
          tasks!inner(
            id,
            post_date,
            due_date,
            archived,
            agency_id,
            task_type
          )
        `, { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .eq('tasks.agency_id', agency.id)
        .eq('tasks.archived', false)
        .eq('tasks.task_type', 'redes_sociais')
        .gte('tasks.due_date', todayBrasilia.toISOString())
        .lte('tasks.due_date', endOfDayBrasilia.toISOString());

      if (postsError) {
        console.error(`Error counting social media tasks for user ${user.user_id}:`, postsError);
      }

      // Count meetings where THIS USER is organizer OR participant
      const { count: userMeetingsCount, error: meetingsError } = await supabase
        .from('meetings')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id)
        .eq('status', 'scheduled')
        .gte('start_time', todayBrasilia.toISOString())
        .lte('start_time', endOfDayBrasilia.toISOString())
        .or(`organizer_id.eq.${user.user_id},participants.cs.["${user.user_id}"]`);

      if (meetingsError) {
        console.error(`Error counting meetings for user ${user.user_id}:`, meetingsError);
      }

      const tasksCount = userTasksCount || 0;
      const postsCount = userPostsCount || 0;
      const meetingsCount = userMeetingsCount || 0;
      const totalItems = tasksCount + postsCount + meetingsCount;

      console.log(`📊 User ${user.user_id}: ${tasksCount} tasks, ${postsCount} posts, ${meetingsCount} meetings assigned for today`);

      // Determine action URL priority: meetings > tasks > posts > dashboard
      let actionUrl = '/dashboard';
      if (meetingsCount > 0) {
        actionUrl = '/agenda';
      } else if (tasksCount > 0) {
        actionUrl = '/tasks';
      } else if (postsCount > 0) {
        actionUrl = '/social-media';
      }

      if (totalItems > 0) {
        // Build personalized message with all counts
        let message = '📋 Resumo do dia: ';
        const parts = [];
        
        if (tasksCount > 0) {
          parts.push(`${tasksCount} tarefa${tasksCount > 1 ? 's' : ''}`);
        }
        
        if (postsCount > 0) {
          parts.push(`${postsCount} post${postsCount > 1 ? 's' : ''}`);
        }

        if (meetingsCount > 0) {
          parts.push(`${meetingsCount} ${meetingsCount > 1 ? 'reuniões' : 'reunião'}`);
        }
        
        // Join with commas and replace last comma with "e"
        message += parts.join(', ').replace(/, ([^,]+)$/, ' e $1') + ' para hoje';

        notificationsToCreate.push({
          user_id: user.user_id,
          agency_id: agency.id,
          type: 'system',
          priority: 'medium',
          title: '🌅 Bom dia! Seu resumo diário',
          message,
          action_url: actionUrl,
          action_label: 'Ver detalhes',
          metadata: { 
            tasks_count: tasksCount,
            posts_count: postsCount,
            meetings_count: meetingsCount,
            date: todayBrasilia.toISOString(),
            play_sound: false
          },
        });
      } else {
        // Send "Bom dia" message for users with no assignments
        notificationsToCreate.push({
          user_id: user.user_id,
          agency_id: agency.id,
          type: 'system',
          priority: 'low',
          title: '🌅 Bom dia!',
          message: 'Sua agenda está livre hoje. Aproveite para planejar ou adiantar demandas!',
          action_url: '/dashboard',
          action_label: 'Ir para o Dashboard',
          metadata: { 
            tasks_count: 0,
            posts_count: 0,
            meetings_count: 0,
            date: todayBrasilia.toISOString(),
            play_sound: false
          },
        });
      }

      // Track for ALL users (both with and without items)
      trackingToCreate.push({
        notification_type: 'daily_summary',
        entity_id: `${agency.id}_${user.user_id}`, // Unique per user
        user_id: user.user_id,
        agency_id: agency.id
      });
    }
  }

  await batchCreateNotifications(notificationsToCreate);
  await batchTrackNotifications(trackingToCreate);

  console.log(`✅ Created ${notificationsToCreate.length} personalized daily summary notifications`);
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json().catch(() => ({}));
    
    console.log('🚀 Starting notification processing...');
    const startTime = Date.now();

    // Acquire global process lock to prevent parallel executions
    const hasLock = await acquireProcessLock('process_notifications');
    if (!hasLock) {
      console.log('⏭️ Another process is running - exiting early');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Skipped - another process is running',
          skipped: true,
          duration_ms: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If action is 'daily_summary', only run that
    if (action === 'daily_summary') {
      await processDailySummary();
    } else {
      // Run all regular notification processors
      await Promise.all([
        processReminders(),
        processTasks(),
        processPosts(),
        processPayments(),
        processExpenses(),
        processLeads(),
        processMeetings(),
      ]);
    }

    // Executar manutenção em background (não bloqueia a resposta)
    cleanupOldTracking().catch(console.error);
    archiveReadNotifications().catch(console.error);

    const duration = Date.now() - startTime;
    console.log(`✅ All notifications processed successfully in ${duration}ms`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: action === 'daily_summary' ? 'Daily summary processed' : 'Notifications processed',
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