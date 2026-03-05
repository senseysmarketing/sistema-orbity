

# Unir Integração e Webhooks em Layout Side-by-Side

## O que será feito

Remover as abas separadas "Integração" e "Webhooks" do CRM Settings e unificá-las em uma única aba chamada "Integrações", exibindo os dois componentes lado a lado em grid de 2 colunas.

## Alteração

### `src/components/crm/CRMSettings.tsx`

- Remover a tab "webhooks" separada
- Renomear a tab "integration" para "Integrações"
- No `TabsContent` de integrações, usar grid 2 colunas:

```tsx
<TabsContent value="integration">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <MetaIntegrationConfig />
    <WebhooksManager />
  </div>
</TabsContent>
```

- Remover o `TabsTrigger` de webhooks e o import do ícone `Webhook`

Arquivo único: `src/components/crm/CRMSettings.tsx`

