

# Storage 3.0 — Plano final com 4 Guardrails

## 1. `src/components/ui/file-attachments.tsx` — Limites + Vídeo + Carrossel

**Defaults**:
- `maxFiles: 5 → 10`
- `maxSizeMB: 5 → 100`
- `ALLOWED_TYPES`: + `video/mp4`, `video/quicktime`, `video/webm`
- `ALLOWED_EXTENSIONS`: + `.mp4`, `.mov`, `.webm`
- `getFileIcon`: branch `video/*` → ícone `Film`
- Copy do dropzone: `"Até 10 arquivos. Máximo de 100MB por arquivo (Imagens ou Vídeos)."`

**`AttachmentsDisplay` refatorado**:
- Carrossel shadcn (`<Carousel opts={{ align: 'start' }}>`) unindo imagens + vídeos numa lista de "medias".
- Por slide:
  - **Lápide** (`url === 'expired'`): card neutro com `Clock` + texto  
    `"Mídia removida automaticamente após 15 dias de conclusão para economia de espaço."`
  - **`image/*`**: `<img className="object-contain w-full max-h-[420px]">` + lightbox no clique.
  - **`video/*`**: `<video controls preload="metadata">` (sem autoplay).
- `CarouselPrevious/Next` visíveis quando `medias.length > 1`.
- Documentos (PDF/Word/Excel) permanecem na lista atual abaixo do carrossel.
- Lightbox filtra apenas imagens reais (sem vídeos/expirados).
- Modo edição: previews de vídeo via `<video>` quando `type.startsWith("video/")`.

## 2. `src/components/tasks/TaskDetailsDialog.tsx` — **Guardrail 1**

Atualizar `APPROVAL_MAX_BYTES` de `10 * 1024 * 1024` → `100 * 1024 * 1024` (sincroniza com o limite de upload).

## 3. Edge Function `storage-garbage-collector` (nova)

`supabase/functions/storage-garbage-collector/index.ts` — Service Role, CORS padrão.

**Lógica** (`verify_jwt = false` em `config.toml`):
1. Query paginada (`.range(0, 999)`):
   ```sql
   select id, attachments
   from tasks
   where status in ('done','approved','concluido')   -- Guardrail 3
     and updated_at < now() - interval '15 days'
     and attachments is not null
   ```
2. Para cada task — **Guardrail 4 (Safe Array Mapping)**:
   - Identificar attachments do bucket `task-attachments` (URL contém `/task-attachments/`).
   - Tentar `supabase.storage.from('task-attachments').remove(paths)` em batch.
   - **`.map()` no array original**:
     - Se o item foi removido com sucesso do bucket → substitui por lápide:  
       `{ id, name: "Arquivo removido para otimização", url: "expired", type: "system", size: 0, uploaded_at: <now> }`
     - Se for link externo (Drive, etc.) ou falhou ao apagar → **mantém intacto**.
3. `update tasks set attachments = <novo array> where id = <task_id>`.
4. Idempotência: tasks que já só tenham lápides (sem URLs reais do bucket) saem no-op no próximo run.
5. Retornar `{ tasks_processed, files_deleted, files_preserved }`.

## 4. CRON **DIÁRIO** — **Guardrail 2**

Via insert SQL (não-migration, contém anon key):
```sql
select cron.schedule(
  'storage-gc-daily',
  '0 3 * * *',  -- 03:00 UTC todos os dias
  $$ select net.http_post(
       url:='https://ovookkywclrqfmtumelw.supabase.co/functions/v1/storage-garbage-collector',
       headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
       body:='{}'::jsonb
     ); $$
);
```
Migration prévia se necessário: `create extension if not exists pg_cron; create extension if not exists pg_net;`.

## Sem alterações

- `TaskDetailsDialog.tsx` (exceto o constant `APPROVAL_MAX_BYTES`) — já consome `AttachmentsDisplay`, herda o carrossel.
- `PublicApproval.tsx` — idem.
- Bucket `task-attachments` (já público).

## Arquivos editados / criados

- **Editado** `src/components/ui/file-attachments.tsx` — limites, vídeo, Carrossel, lápide, preview de vídeo.
- **Editado** `src/components/tasks/TaskDetailsDialog.tsx` — `APPROVAL_MAX_BYTES = 100MB`.
- **Editado** `supabase/config.toml` — `[functions.storage-garbage-collector] verify_jwt = false`.
- **Criado** `supabase/functions/storage-garbage-collector/index.ts` — robô com Safe Array Mapping.
- **Migration** — `create extension if not exists pg_cron/pg_net` (se faltarem).
- **Insert SQL** — `cron.schedule` diário às 03:00 UTC.

## Resultado

- Carrosséis nativos para até 10 mídias (img + vídeo, 100MB cada).
- Limites de upload e aprovação alinhados (sem bloqueio na entrega ao cliente).
- GC diário, inteligência de 15 dias na query, cobertura completa de status finais.
- Links externos e documentos preservados — só ficheiros reais do bucket viram lápide.

