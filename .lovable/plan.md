

# Upgrade Estrutural: Smart Table + Dashboard Unificado "Quiet Luxury"

## Resumo
Reescrever `Clients.tsx` (cards para tabela), `ClientDetail.tsx` (tabs para Bento Grid escuro), criar `ClientHealthScore.tsx`, e adicionar animação glow ao Tailwind config.

---

## Ficheiros alterados/criados

### 1. `src/pages/Clients.tsx` — Reescrita completa: Cards para Smart Table

**Query adicional:** Buscar contagem de tarefas pendentes por cliente via `task_clients` join para alimentar o Health Score dinâmico.

```
const { data: taskCounts } = useQuery(["client-task-counts", agencyId], ...)
→ SELECT task_clients.client_id, COUNT(*) FROM task_clients JOIN tasks ON ... WHERE status NOT IN ('done','cancelled') GROUP BY client_id
```

**Layout da tabela:**
- Container: `bg-slate-50 rounded-xl border overflow-hidden`
- Colunas: Cliente (avatar+nome+serviço) | Contato | Status (Badge) | Health Score (Badge dinâmica) | Desde | Ação (ChevronRight)
- Linhas: `hover:bg-slate-100/50 cursor-pointer transition-colors`
- Skeleton: 6 linhas de tabela

**Health Score dinâmico (Refinamento 4):**
- Heurística base: tempo de casa (>12m=Excelente, 6-12=Bom, 3-6=Atenção, <3=Novo)
- Override: se `pendingTasks > 5`, score nunca é "Excelente" — cai para "Atenção"
- Cores: verde/amarelo/laranja/cinza

### 2. `src/components/clients/ClientHealthScore.tsx` — Novo componente

Props: `startDate`, `pendingTaskCount`
Retorna Badge colorida com label e lógica combinada.

### 3. `src/pages/ClientDetail.tsx` — Reescrita completa: Tabs para Dashboard Bento Grid

**Queries inline paralelas** (Promise.all):
1. Tarefas pendentes via `task_clients` join (limit 8)
2. Reuniões recentes via `meeting_clients` join (limit 5)
3. Credenciais via `client_credentials` (limit 5)
4. Último criativo: buscar tarefa mais recente do tipo `redes_sociais` com `attachments IS NOT NULL` via `task_clients` join (limit 1) — extrair primeira URL do JSON de attachments

**Tema:** `bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 -m-6 p-6 text-white`
Cards internos: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`

**Layout Bento Grid:**

**Mobile (ordem de prioridade — Refinamento 3):**
1. Header (voltar + avatar + nome + badge + tempo de casa + botões WhatsApp/Drive)
2. Resumo IA (Alert)
3. Saúde do Cliente (círculo)
4. Próximas Tarefas
5. Vault de Acessos
6. Reuniões
7. Último Criativo

**Desktop:** `grid grid-cols-1 lg:grid-cols-5 gap-4`
- Esquerda (col-span-3): Tarefas + Reuniões + Último Criativo
- Direita (col-span-2): Resumo IA + Saúde + Vault

**Blocos:**

- **Header**: Avatar grande, nome, badge status, tempo de casa, botões WhatsApp (`https://wa.me/` + contact) e Drive (`#`)
- **Resumo IA (Refinamento 2)**: Texto dinâmico montado com variáveis reais ("Cliente ativo há X meses. Y tarefas pendentes. Próxima reunião em Z."). Ícone Sparkles com animação `animate-glow` (pulse roxo)
- **Saúde do Cliente**: Círculo grande com nota A/B/C/D, usa `ClientHealthScore` internamente
- **Próximas Tarefas**: Lista compacta (título + badge status + prioridade + due_date), botão "Ver todas"
- **Vault de Acessos**: Lista compacta (plataforma + username + botão copiar senha), botão "Ver todos"
- **Reuniões**: Lista compacta (título + data + badge status), botão "Agendar"
- **Último Criativo (Refinamento 1)**: Card com imagem da primeira attachment da tarefa `redes_sociais` mais recente. Placeholder com ícone Image se não houver

**Componentes existentes preservados** — não são deletados, apenas não usados nesta view.

### 4. `tailwind.config.ts` — Adicionar animação glow

```
keyframes: {
  glow: {
    "0%, 100%": { opacity: "0.4", filter: "drop-shadow(0 0 6px rgb(168 85 247 / 0.4))" },
    "50%": { opacity: "1", filter: "drop-shadow(0 0 12px rgb(168 85 247 / 0.8))" },
  }
},
animation: {
  glow: "glow 2s ease-in-out infinite",
}
```

---

## Guardrails
- Nenhuma alteração no banco de dados
- Componentes existentes em `/components/clients/` preservados intactos
- Rota `/dashboard/clients/:id` mantida
- Queries com `.limit()` para segurança
- `Promise.all` para queries paralelas no dashboard

