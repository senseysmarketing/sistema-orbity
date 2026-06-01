## Causa

A função `conexa-list-invoicing-methods` **não foi deployada** — o `curl` retorna 404 `NOT_FOUND` e o painel não tem logs. Os arquivos existem no projeto e o `config.toml` registra a função, mas o deploy automático não rodou (ou falhou silenciosamente) quando criamos a função na sessão anterior. Por isso o navegador mostra "Failed to send a request to the Edge Function".

## Plano

1. Fazer o deploy individual da função `conexa-list-invoicing-methods` via `supabase--deploy_edge_functions` (estratégia padrão do projeto, conforme memória "Deploy Estratégia").
2. Revalidar com `curl` direto ao endpoint e confirmar `200` (ou pelo menos resposta JSON com lista de meios / erro de credencial — não mais 404).
3. Se o deploy falhar, ler os logs retornados e ajustar imports/bundle conforme necessário.

Nenhum código precisa mudar — só publicar o que já está no repo.
