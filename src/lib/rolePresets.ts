export interface AppPermissions {
  // Operacional
  clients: boolean;
  tasks: boolean;
  reminders: boolean;
  agenda: boolean;
  crm: boolean;

  // Marketing & Vendas
  social_media: boolean;
  traffic: boolean;
  contracts: boolean;

  // Administração
  nps: boolean;
  goals: boolean;
  financial: boolean;
  reports: boolean;
  import_data: boolean;
}

export const DEFAULT_PERMISSIONS: AppPermissions = {
  clients: true,
  tasks: true,
  reminders: true,
  agenda: true,
  crm: true,
  social_media: false,
  traffic: false,
  contracts: false,
  nps: false,
  goals: false,
  financial: false,
  reports: false,
  import_data: false,
};

const ALL_FALSE: AppPermissions = {
  clients: false, tasks: false, reminders: false, agenda: false, crm: false,
  social_media: false, traffic: false, contracts: false,
  nps: false, goals: false, financial: false, reports: false, import_data: false,
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
    description: "Foco em entregas criativas. Acessa apenas suas tarefas e lembretes.",
    permissions: { ...ALL_FALSE, tasks: true, reminders: true },
  },
  {
    id: "Social Media",
    label: "Social Media",
    emoji: "📱",
    description: "Gerencia conteúdo, posts e calendário editorial.",
    permissions: { ...ALL_FALSE, tasks: true, reminders: true, agenda: true, social_media: true },
  },
  {
    id: "Gestor de Tráfego",
    label: "Gestor de Tráfego",
    emoji: "🎯",
    description: "Controla campanhas, contas de anúncio e qualifica leads.",
    permissions: {
      ...ALL_FALSE,
      tasks: true, reminders: true, agenda: true,
      clients: true, crm: true, traffic: true, reports: true,
    },
  },
  {
    id: "Comercial",
    label: "Comercial / Vendedor",
    emoji: "💼",
    description: "Trabalha pipeline de vendas, leads, contratos e reuniões.",
    permissions: {
      ...ALL_FALSE,
      reminders: true, agenda: true,
      clients: true, crm: true, nps: true, contracts: true,
    },
  },
  {
    id: "Gerente",
    label: "Gerente de Operações",
    emoji: "👑",
    description: "Vê toda a operação, exceto Financeiro Administrativo e Importação.",
    permissions: {
      clients: true, tasks: true, reminders: true, agenda: true, crm: true,
      social_media: true, traffic: true, contracts: true,
      nps: true, goals: true, financial: false, reports: true, import_data: false,
    },
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

const PERM_KEYS: (keyof AppPermissions)[] = [
  "clients", "tasks", "reminders", "agenda", "crm",
  "social_media", "traffic", "contracts",
  "nps", "goals", "financial", "reports", "import_data",
];

export function detectPresetFromPermissions(perms: AppPermissions): string {
  for (const preset of ROLE_PRESETS) {
    if (preset.isCustom) continue;
    const p = preset.permissions;
    const match = PERM_KEYS.every((k) => p[k] === perms[k]);
    if (match) return preset.id;
  }
  return "Personalizado";
}
