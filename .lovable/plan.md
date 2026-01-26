
# Plano: Sistema de Duas Datas para Social Media (Post Date + Due Date)

## Visão Geral

Implementar um sistema de duas datas distintas no módulo de Social Media para separar claramente:
- **`post_date`**: Data/hora em que o conteúdo será publicado nas redes sociais
- **`due_date`**: Data limite para a designer entregar a arte pronta para aprovação

Isso resolve o problema de confusão entre "quando a arte precisa estar pronta" e "quando o post vai ao ar".

---

## Arquitetura da Solução

```text
+-------------------+     +-------------------+     +-------------------+
|   Social Media    |     |     Designer      |     |    Calendário     |
+-------------------+     +-------------------+     +-------------------+
         |                        |                        |
         v                        v                        v
   Define ambas            Foca em due_date         Mostra post_date
   as datas                (lista de entregas)      (programação)
         |                        |                        |
         +------------------------+------------------------+
                                  |
                                  v
                      +------------------------+
                      |   social_media_posts   |
                      |------------------------|
                      | post_date (timestamp)  |
                      | due_date  (timestamp)  |
                      +------------------------+
```

---

## 1. Migração de Banco de Dados

### Nova Migration SQL

```sql
-- Adicionar colunas post_date e due_date
ALTER TABLE public.social_media_posts
ADD COLUMN IF NOT EXISTS post_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Migrar dados existentes: scheduled_date -> post_date
UPDATE public.social_media_posts
SET post_date = scheduled_date
WHERE post_date IS NULL;

-- Calcular due_date = post_date - 3 dias (default)
UPDATE public.social_media_posts
SET due_date = post_date - INTERVAL '3 days'
WHERE due_date IS NULL AND post_date IS NOT NULL;

-- Adicionar configuração de dias de antecedência por agência
CREATE TABLE IF NOT EXISTS public.social_media_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  default_due_date_days_before INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

-- RLS para social_media_settings
ALTER TABLE public.social_media_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver settings da sua agência"
  ON public.social_media_settings FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins podem gerenciar settings"
  ON public.social_media_settings FOR ALL
  USING (agency_id IN (
    SELECT agency_id FROM agency_users 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ));
```

### Alterações nos Tipos TypeScript

**Arquivo: `src/integrations/supabase/types.ts`**
- Adicionar `post_date` e `due_date` à interface `social_media_posts`
- Regenerar types via CLI do Supabase

**Arquivo: `src/hooks/useSocialMediaPosts.tsx`**
- Atualizar interface `SocialMediaPost`:
  ```typescript
  export interface SocialMediaPost {
    // ... campos existentes
    scheduled_date: string;  // Mantido para compatibilidade
    post_date: string | null;
    due_date: string | null;
  }
  ```

---

## 2. Formulário de Postagem

**Arquivo: `src/components/social-media/PostFormDialog.tsx`**

### Novos Campos no Formulário

```text
+------------------------------------------+
|  Data de Postagem *                      |
|  [📅 datetime-local]                     |
|  "Quando este conteúdo vai ao ar"        |
+------------------------------------------+
|  Data Limite da Arte                     |
|  [📅 datetime-local]     [Auto: 3 dias]  |
|  "Até quando a arte precisa estar pronta"|
+------------------------------------------+
```

### Lógica de Auto-cálculo

- Ao definir `post_date`, calcular automaticamente `due_date = post_date - X dias`
- X = configuração da agência (default: 3 dias)
- Usuário pode sobrescrever manualmente o `due_date`

---

## 3. Card de Postagem (Kanban)

**Arquivo: `src/components/social-media/PostCard.tsx`**

### Layout Proposto

```text
+--------------------------------------+
| [Feed Icon]    [Prioridade] [Urgência]
|                                      |
| Título do Post                       |
| Descrição breve...                   |
|                                      |
| 📅 Post: 25/01  ⏳ Arte até: 22/01   |
| [Badge Cliente]                      |
+--------------------------------------+
```

### Badge de Urgência (baseado em due_date)

| Condição | Badge | Cor |
|----------|-------|-----|
| due_date vencido + status != approved/published | "ATRASADO" | Vermelho |
| due_date = hoje | "Hoje" | Laranja |
| due_date = amanhã | "Amanhã" | Amarelo |
| due_date <= 7 dias | "Esta semana" | Azul |

---

## 4. Calendário

**Arquivo: `src/components/social-media/SocialMediaCalendar.tsx`**

### Mudanças

1. **Filtro por data**: Usar `post_date` (não mais `scheduled_date`)
2. **Indicador secundário**: Mostrar `due_date` no card do calendário
   - Formato: "Arte até DD/MM" em texto menor

### Card Compacto no Calendário

```text
+---------------------------+
| [Icon] Título do Post     |
| Arte até: 22/01    [●]    |
+---------------------------+
```

---

## 5. Filtros e Ordenação no Kanban

**Arquivo: `src/components/social-media/PostKanban.tsx`**

### Novos Filtros

1. **Ordenar por**:
   - Data de postagem (post_date) - default
   - Data de entrega (due_date)
   
2. **Filtro de Período** (existente):
   - Aplicar ao campo selecionado (post_date ou due_date)

### Adicionar Toggle/Select de Ordenação

```text
[Ordenar: ▼ Data de Postagem | Data de Entrega]
```

---

## 6. Modo "Planejar Semana Seguinte"

### Atalho Rápido (Opcional - Fase 2)

Adicionar botão no header:
```text
[+ Planejar Próxima Semana]
```

Ao clicar:
1. Filtrar posts com `post_date` na próxima semana
2. Ao criar novo post, pré-preencher:
   - `post_date` = dia selecionado
   - `due_date` = `post_date - X dias` (configurável)

---

## 7. Dialog de Detalhes

**Arquivo: `src/components/social-media/PostDetailsDialog.tsx`**

### Exibição das Duas Datas

```text
📅 Data de Publicação
   25 de janeiro de 2026 às 10:00

⏳ Data Limite da Arte
   22 de janeiro de 2026
   [Badge: ATRASADO / Hoje / Em dia]
```

---

## 8. Configurações de Agência

**Arquivo: `src/components/social-media/SocialMediaSettings.tsx`**

### Nova Aba: "Prazos"

```text
+------------------------------------------+
| Dias de Antecedência para Entrega        |
| [3 ▼] dias antes da data de postagem     |
|                                          |
| Este valor será usado como padrão ao     |
| criar novas postagens.                   |
+------------------------------------------+
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/new_migration.sql` | Criar colunas `post_date`, `due_date` e tabela `social_media_settings` |
| `src/integrations/supabase/types.ts` | Atualizar tipos (regenerar via CLI) |
| `src/hooks/useSocialMediaPosts.tsx` | Atualizar interface e lógica de fetch |
| `src/components/social-media/PostFormDialog.tsx` | Adicionar campos `post_date` e `due_date` com auto-cálculo |
| `src/components/social-media/PostCard.tsx` | Exibir ambas as datas e badge de urgência baseado em `due_date` |
| `src/components/social-media/PostDetailsDialog.tsx` | Mostrar ambas as datas com indicador de status |
| `src/components/social-media/SocialMediaCalendar.tsx` | Usar `post_date` para posicionar, mostrar `due_date` como info secundária |
| `src/components/social-media/PostKanban.tsx` | Adicionar ordenação por `post_date` ou `due_date` |
| `src/components/social-media/SocialMediaSettings.tsx` | Nova aba para configurar dias de antecedência |
| `src/components/social-media/settings/DueDateSettingsManager.tsx` | Novo componente para gerenciar configuração de prazos |

---

## Compatibilidade com Dados Existentes

1. **Migração automática**: `scheduled_date` → `post_date`
2. **Cálculo de due_date**: `post_date - 3 dias` para posts existentes
3. **Campo `scheduled_date` mantido**: Para não quebrar queries existentes (deprecado gradualmente)

---

## Critérios de Aceite

- [ ] Social Media consegue definir `post_date` e `due_date` ao criar/editar posts
- [ ] Designer enxerga claramente o que vence primeiro (ordenar por `due_date`)
- [ ] Badge "ATRASADO" aparece quando `due_date` venceu e post não está aprovado/publicado
- [ ] Calendário mostra posts pela `post_date`
- [ ] Calendário indica `due_date` como informação secundária
- [ ] Auto-cálculo de `due_date` baseado em configuração da agência
- [ ] Filtro de período funciona para ambas as datas
- [ ] Posts existentes são migrados automaticamente
