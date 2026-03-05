

# Botão "Reconfigurar" na tela de QR Code do WhatsApp

## Problema

Quando a instância do Evolution API é excluída externamente, o sistema continua mostrando o QR Code e tentando polling, gerando erros silenciosos. Não há como voltar ao formulário de configuração sem desconectar.

## Solução

1. **Detectar erros no polling/check** — quando `checkStatus` ou `refreshQR` falham repetidamente, exibir um alerta amarelo/vermelho avisando que a instância pode ter sido removida.

2. **Botão "Reconfigurar"** na tela do QR Code — ao lado do "Atualizar QR", adicionar um botão que:
   - Limpa o QR code local (`setQrCode(null)`)
   - Volta para o formulário de conexão com os campos preenchidos para edição

3. **Estado de erro visível** — adicionar um state `connectionError` que é setado quando o polling falha, mostrando uma mensagem como "A instância pode ter sido removida. Reconfigure a conexão."

### Alterações em `src/components/settings/WhatsAppIntegration.tsx`

- Novo state `connectionError: boolean`
- Nos `catch` do polling e auto-check, setar `connectionError = true`
- Na área do QR Code, se `connectionError`, mostrar alerta com ícone `AlertTriangle`
- Novo botão "Reconfigurar" que faz `setQrCode(null)` para voltar ao formulário
- Adicionar import `AlertTriangle, Settings` do lucide

