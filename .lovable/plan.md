

# Simplificação UX do ConexaIntegration.tsx

## Resumo
Reorganizar a interface: grid 2 colunas para campos principais, auto-geração da chave de segurança com botão Refresh (com alerta de confirmação), accordion para campos de baixa manual, e remoção do aviso amarelo da URL.

## Alterações (1 arquivo)

### `src/components/settings/ConexaIntegration.tsx`

**Imports**: Adicionar `RefreshCw` do lucide-react. Adicionar `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger` do shadcn.

**Helper function** (fora do componente):
```typescript
function generateRandomKey(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(b => chars[b % chars.length]).join("");
}
```

**useEffect**: Se `settings.conexa_webhook_token` estiver vazio, auto-gerar via `generateRandomKey()`.

**webhookUrl**: Sempre usar o token (nunca "SUA_CHAVE_AQUI"), pois agora é auto-gerado.

**Layout em Grid 2 colunas**:
- Linha 1: Subdomínio + Token de Acesso
- Linha 2: Unit ID + Product ID
- Linha 3: Company ID (sozinho)

**Chave de Segurança**: Campo com 3 botões inline (show/hide + Refresh com AlertDialog de confirmação). O AlertDialog avisa: "Ao regerar a chave, você precisará atualizar a URL no painel do Conexa para manter a sincronização. Deseja continuar?"

**Accordion "Baixa Manual"**: Novo accordion agrupando Conta Bancária + Meio de Recebimento, com descrição explicativa. Remover os Separators antigos.

**Remover**: Aviso amarelo "⚠️ Defina a chave de segurança acima..." (não mais necessário).

### Estrutura visual final
```text
[Switch Habilitar Conexa]
──────────────────────────
| Subdomínio          | Token de Acesso       |
| Unit ID             | Product ID            |
| Company ID          |                       |
──────────────────────────
🔐 Chave de Segurança [████████] [👁] [🔄→AlertDialog]
   "Chave gerada automaticamente..."
──────────────────────────
🔌 Como configurar Webhooks (accordion)
   └─ Instruções + URL completa + Copiar
⚙️ Configurações de Baixa Manual (accordion)
   └─ Conta Bancária + Meio de Recebimento
──────────────────────────
[Salvar e Conectar]
```

## Resumo de arquivos
- 1 componente frontend (`ConexaIntegration.tsx`)
- 0 migrations, 0 edge functions

