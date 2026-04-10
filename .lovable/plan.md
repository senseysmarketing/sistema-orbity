

# Reorganizar Card Meta Ads no estilo Google Calendar

## Alterações em `src/components/settings/FacebookIntegration.tsx`

### Header
- Trocar o ícone solto `<Facebook>` por um container com fundo azul (`bg-blue-100 rounded-lg`) igual ao Google Calendar
- Badge "Conectado" com estilo outline verde (✓ Conectado) em vez do badge sólido verde
- Usar mesma estrutura de padding (`p-4 sm:p-6`)

### Estado conectado — blocos com `border rounded-lg`
Reorganizar as informações em blocos visuais separados (mesmo padrão `p-3 sm:p-4 border rounded-lg`):

1. **Conta conectada** — bloco com `bg-muted/30`:
   - Nome do negócio (`business_name`) como título
   - Facebook User ID abaixo em texto menor
   - Última sincronização como subtexto

2. **Contas de anúncio** — bloco com ícone Users + contagem

3. **Token** — bloco com status do token (badge verde/amarelo/vermelho)

4. **Rodapé** — botão "Desconectar" no estilo destructive igual ao Google Calendar (sem AlertDialog inline, usar botão direto com confirmação)

### Estado desconectado
- Adicionar bloco "Recursos disponíveis" com lista de features (igual ao Google Calendar) antes do botão de conectar

### Dados adicionais
- O campo `business_name` da `facebook_connections` já contém o nome da conta — será exibido como título do bloco "Conta conectada"
- Buscar também o `facebook_user_name` se disponível na tabela (verificar schema)

## Arquivo modificado (1)
- `src/components/settings/FacebookIntegration.tsx`

