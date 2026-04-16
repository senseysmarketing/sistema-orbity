

# Correções no ClientDetail — Reuniões, Drive, Vault e Limites

## Problemas e soluções

### 1. Reuniões não clicáveis + rota errada
- A rota do "Ver todas" aponta para `/dashboard/meetings` (inexistente). Corrigir para `/dashboard/agenda`.
- Tornar cada reunião clicável: importar `MeetingDetailsDialog`, adicionar estado `selectedMeeting`/`detailsOpen`. Ao clicar numa reunião, buscar dados completos da meeting via query individual (o dashboard só traz campos limitados) e abrir o dialog.
- Alternativa mais simples: expandir a query de meetings no `dashboardData` para trazer todos os campos necessários (`*` em vez de campos específicos), permitindo cast direto para `Meeting`.

### 2. Drive — campo dedicado na DB + formulário
- Não existe coluna `drive_folder_url` na tabela `clients`. Criar via migration.
- Adicionar campo "Link Google Drive" ao `ClientForm.tsx`.
- No `ClientDetail`, usar `client.drive_folder_url` em vez do regex sobre `observations`.

### 3. Limitar itens exibidos
- Tarefas: exibir no máximo **5** items no card (`.slice(0, 5)`). Mostrar badge "+X" se houver mais.
- Reuniões: exibir no máximo **5** items no card (`.slice(0, 5)`). Mostrar badge "+X" se houver mais.

### 4. Vault — editar, excluir e "Ver todos"
- O botão "Ver todos" aponta para a própria página (`/dashboard/clients/${id}`). Não há rota separada de vault, então transformar num scroll/expand: ao clicar, mostrar todos os acessos num Dialog listando todas as credenciais com opções de editar e excluir.
- Cada credencial no card: adicionar botões `Edit2` e `Trash2` (ghost, h-7 w-7).
- Editar: reutilizar o dialog de credenciais preenchendo os campos e fazendo UPDATE.
- Excluir: confirmar com AlertDialog e DELETE da `client_credentials`.

---

## Ficheiros alterados

### Migration SQL
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;
```

### `src/components/admin/ClientForm.tsx`
- Adicionar campo Input "Link Google Drive" mapeado a `drive_folder_url`.

### `src/pages/ClientDetail.tsx`
- **Imports**: adicionar `MeetingDetailsDialog`, `Trash2`, `Edit2` (já importado), `AlertDialog`.
- **Estado**: `selectedMeeting`, `detailsOpen`, `editingCred`, `deletingCredId`, `allCredentialsOpen`.
- **Drive**: usar `client.drive_folder_url` em vez do regex.
- **Meetings query**: expandir select para `meetings!inner(*)` para ter dados completos.
- **Meetings route**: `/dashboard/meetings` → `/dashboard/agenda`.
- **Meetings click**: cada item recebe `cursor-pointer` e `onClick` que abre `MeetingDetailsDialog`.
- **Tasks/Meetings limit**: `.slice(0, 5)` com indicador "+N mais".
- **Vault "Ver todos"**: abre dialog com lista completa (remove o limite de 5 da query).
- **Vault edit**: ao clicar edit, preenche `newCred` com dados existentes e faz UPDATE em vez de INSERT.
- **Vault delete**: AlertDialog de confirmação + DELETE.
- **Render dialogs**: adicionar `MeetingDetailsDialog` e `AlertDialog` de exclusão de credencial.

### Guardrails
- Zero navegação para fora da página (excepto "Ver todas" para agenda)
- Reutiliza `MeetingDetailsDialog` existente
- Query de credenciais sem limite para poder listar todas no dialog expandido

