interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationGroup {
  icon: string;
  label: string;
  count: number;
  items: Notification[];
}

export function formatDailyDigest(notifications: Notification[], userName: string): string {
  // Group notifications by type
  const grouped: { [key: string]: NotificationGroup } = {
    reminder: { icon: '⏰', label: 'Lembretes', count: 0, items: [] },
    task: { icon: '📋', label: 'Tarefas', count: 0, items: [] },
    post: { icon: '📱', label: 'Posts', count: 0, items: [] },
    payment: { icon: '💰', label: 'Pagamentos', count: 0, items: [] },
    lead: { icon: '🎯', label: 'Leads', count: 0, items: [] },
    meeting: { icon: '📅', label: 'Reuniões', count: 0, items: [] },
    expense: { icon: '💳', label: 'Despesas', count: 0, items: [] },
    system: { icon: '🔔', label: 'Sistema', count: 0, items: [] },
  };

  // Categorize notifications
  notifications.forEach(notif => {
    const type = notif.type;
    if (grouped[type]) {
      grouped[type].count++;
      grouped[type].items.push(notif);
    } else {
      grouped.system.count++;
      grouped.system.items.push(notif);
    }
  });

  // Filter out empty categories
  const activeGroups = Object.entries(grouped).filter(([_, group]) => group.count > 0);

  // Sort by priority (high priority types first)
  const priorityOrder = ['payment', 'lead', 'task', 'meeting', 'reminder', 'post', 'expense', 'system'];
  activeGroups.sort((a, b) => {
    return priorityOrder.indexOf(a[0]) - priorityOrder.indexOf(b[0]);
  });

  // Build summary section
  const summaryItems = activeGroups
    .map(([_, group]) => `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
        <div style="font-size: 24px;">${group.icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #111827;">${group.count} ${group.label}</div>
        </div>
      </div>
    `)
    .join('');

  // Build detailed sections
  const detailSections = activeGroups
    .map(([_, group]) => {
      // Show max 5 most recent per category
      const displayItems = group.items.slice(0, 5);
      const remaining = group.count - displayItems.length;

      const itemsHtml = displayItems
        .map(item => `
          <div style="padding: 12px; border-left: 3px solid #667eea; background: white; border-radius: 4px; margin-bottom: 8px;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${item.title}</div>
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${item.message}</div>
            <div style="color: #9ca3af; font-size: 12px;">
              ${new Date(item.created_at).toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        `)
        .join('');

      const moreText = remaining > 0 
        ? `<div style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 8px;">+ ${remaining} mais</div>` 
        : '';

      return `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>${group.icon}</span>
            <span>${group.label}</span>
            <span style="color: #9ca3af; font-weight: normal; font-size: 14px;">(${group.count})</span>
          </h3>
          ${itemsHtml}
          ${moreText}
        </div>
      `;
    })
    .join('');

  // Date header
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white;
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center; 
    }
    .content { 
      padding: 30px; 
    }
    .footer { 
      text-align: center; 
      padding: 30px; 
      background: #f9fafb;
      color: #6b7280; 
      font-size: 12px; 
      border-top: 1px solid #e5e7eb;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0 0 8px 0; font-size: 28px;">🌅 Seu Resumo Diário</h1>
      <p style="margin: 0; opacity: 0.9; font-size: 14px;">${dateStr}</p>
    </div>
    
    <div class="content">
      <p style="font-size: 16px; color: #111827; margin-bottom: 24px;">
        Olá <strong>${userName}</strong>,
      </p>
      
      <p style="color: #6b7280; margin-bottom: 24px;">
        Aqui está o resumo do que aconteceu ontem:
      </p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin-bottom: 32px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">📊 Resumo Geral</h2>
        ${summaryItems}
      </div>

      <div>
        <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #111827;">📝 Detalhes</h2>
        ${detailSections}
      </div>

      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <a href="https://orbityapp.com.br" class="cta-button">
          Ver todas no sistema
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 8px 0;">
        Você recebeu este resumo diário porque está cadastrado no Orbity.
      </p>
      <p style="margin: 0;">
        Para alterar suas preferências de notificação, <a href="https://orbityapp.com.br/settings" style="color: #667eea;">acesse as configurações</a>.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
