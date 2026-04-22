export interface AppPermissions {
  crm: boolean;
  tasks: boolean;
  financial: boolean;
  traffic: boolean;
  social_media: boolean;
  agenda: boolean;
}

export const DEFAULT_PERMISSIONS: AppPermissions = {
  crm: true,
  tasks: true,
  financial: false,
  traffic: false,
  social_media: false,
  agenda: true,
};

export interface RolePreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  permissions: AppPermissions;
  isCustom?: boolean;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: "Designer",
    label: "Designer",
    emoji: "🎨",
    description: "Foco em entregas criativas. Acessa apenas suas tarefas.",
    permissions: { tasks: true, social_media: false, crm: false, financial: false, traffic: false, agenda: false },
  },
  {
    id: "Social Media",
    label: "Social Media",
    emoji: "📱",
    description: "Gerencia conteúdo, posts e calendário editorial.",
    permissions: { tasks: true, social_media: true, crm: false, financial: false, traffic: false, agenda: true },
  },
  {
    id: "Gestor de Tráfego",
    label: "Gestor de Tráfego",
    emoji: "🎯",
    description: "Controla campanhas, contas de anúncio e qualifica leads.",
    permissions: { tasks: true, social_media: false, crm: true, financial: false, traffic: true, agenda: false },
  },
  {
    id: "Comercial",
    label: "Comercial / Vendedor",
    emoji: "💼",
    description: "Trabalha pipeline de vendas, leads e reuniões.",
    permissions: { tasks: false, social_media: false, crm: true, financial: false, traffic: false, agenda: true },
  },
  {
    id: "Gerente",
    label: "Gerente de Operações",
    emoji: "👑",
    description: "Vê toda a operação, exceto dados financeiros sensíveis.",
    permissions: { tasks: true, social_media: true, crm: true, financial: false, traffic: true, agenda: true },
  },
  {
    id: "Personalizado",
    label: "Personalizado",
    emoji: "⚙️",
    description: "Configure manualmente cada acesso.",
    permissions: { ...DEFAULT_PERMISSIONS },
    isCustom: true,
  },
];

export function detectPresetFromPermissions(perms: AppPermissions): string {
  for (const preset of ROLE_PRESETS) {
    if (preset.isCustom) continue;
    const p = preset.permissions;
    if (
      p.crm === perms.crm &&
      p.tasks === perms.tasks &&
      p.financial === perms.financial &&
      p.traffic === perms.traffic &&
      p.social_media === perms.social_media &&
      p.agenda === perms.agenda
    ) {
      return preset.id;
    }
  }
  return "Personalizado";
}
