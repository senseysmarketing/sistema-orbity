

# Facebook Integration Card nas Configurações + Redirect do Tráfego

## Resumo
Criar um componente `FacebookIntegration.tsx` na aba de Integrações (Settings) que centraliza a conexão/desconexão do Facebook, e atualizar a tela de Controle de Tráfego para redirecionar o usuário às Configurações quando não houver conexão ativa.

## 1. Novo componente: `src/components/settings/FacebookIntegration.tsx`

Card no mesmo padrão visual do Google Calendar e WhatsApp:
- **Header**: ícone Facebook + título "Meta Ads" + Badge Conectado/Desconectado
- **Descrição**: "Conecte Facebook e Instagram Ads para monitorar campanhas"
- **Estado desconectado**: Botão "Conectar Facebook" que abre o `FacebookConnectionDialog` existente
- **Estado conectado**: Exibe nome do negócio, data da conexão, e botões "Desconectar"
- Reutiliza a mesma lógica de `facebook_connections` já presente em `Traffic.tsx` (query por `agency_id` + `is_active`)

## 2. Atualizar `src/pages/Settings.tsx`

- Importar `FacebookIntegration`
- Adicionar na grid de integrações (antes do Asaas/Conexa): `{isAgencyAdmin && <FacebookIntegration />}`

## 3. Atualizar `src/pages/Traffic.tsx`

- No bloco `facebookConnections.length === 0` (linhas 171-223): substituir o Dialog de conexão inline por uma mensagem + botão que redireciona para `/dashboard/settings?tab=integrations`
- Texto: "Configure a conexão do Facebook nas Configurações"
- Botão: "Ir para Integrações" com `useNavigate`
- Remover imports não mais necessários (FacebookConnectionDialog do contexto de "primeira conexão")
- Manter o Dialog de desconexão e reconexão no header do tráfego quando já conectado

## Arquivos modificados (3)
- `src/components/settings/FacebookIntegration.tsx` (novo)
- `src/pages/Settings.tsx`
- `src/pages/Traffic.tsx`

