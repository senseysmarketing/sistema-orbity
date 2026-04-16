

# Padronizar UX de Webhook: Conexa igual ao Asaas + correção da etapa 5

## Investigação necessária
1. Ver o componente atual do Asaas para replicar o estilo do bloco azul de instruções
2. Ver o componente atual do Conexa que usa um Accordion colapsável
3. Identificar a etapa 5 do Asaas que está quebrando linha
<lov-tool-use id="toolu_vrtx_01SecbNKUiGUV1LdTkhTXp6v" name="code--search_files" integration-id="code" data="{\"query\": \"Como configurar o Webhook\", \"include_patterns\": \"*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_018Xf3ygd8ZvJ45G63FCnBNm" name="code--search_files" integration-id="code" data="{\"query\": \"Como configurar o Webhook\", \"include_patterns\": \"*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_015NEAo7pa4bDdtQ7czyiVG7" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/settings/AsaasIntegration.tsx\", \"lines\": \"180-280\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_017Dk774JnriYDRn7txW9jmH" name="code--search_files" integration-id="code" data="{\"query\": \"Como configurar os Webhooks automáticos\", \"include_patterns\": \"*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CvBVt72JRah6vvADn4Gnxm" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/settings/ConexaIntegration.tsx\", \"lines\": \"280-400\"}">
</lov-tool-use>
Tenho contexto suficiente.

<lov-plan>

# Padronizar guia de Webhook do Conexa + corrigir alinhamento da etapa 5 do Asaas

## 1) Conexa — guia visível por padrão (estilo Asaas)

Em `src/components/settings/ConexaIntegration.tsx`:

- **Remover** o `AccordionItem value="webhook-instructions"` (envoltório recolhível).
- **Substituir** por um `<Alert>` sempre visível com o mesmo padrão visual do Asaas (fundo azul claro, ícone `Info`, título azul forte, lista decimal abaixo):

```tsx
<Alert className="mt-2 bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
  <Info className="h-4 w-4 text-blue-500" />
  <AlertDescription className="text-xs space-y-3 ml-2">
    <p className="font-semibold text-sm text-blue-800 dark:text-blue-300">
      Como configurar o Webhook no Conexa
    </p>
    <ol className="space-y-2 list-decimal list-outside pl-5 text-muted-foreground">
      <li>Acesse <strong>Configurações → Integrações → Webhooks</strong>.</li>
      <li><strong>Conexão 1 — Pagamentos:</strong> Nova Conexão → Personalizado. Cole a URL abaixo. Em Eventos de Cobrança marque <strong>Quitação</strong>.</li>
      <li><strong>Conexão 2 — Cancelamentos:</strong> Nova conexão com a mesma URL. Marque <strong>Alteração de status</strong>.</li>
      <li>Cole esta URL no campo "URL" das duas conexões:
        <div className="mt-2 flex gap-2">{/* Input readOnly + Copy button */}</div>
      </li>
    </ol>
  </AlertDescription>
</Alert>
```

- O `AccordionItem` de **Baixa Manual (Opcional)** permanece colapsável.
- Garantir import de `Info` do `lucide-react` (se ausente).

## 2) Asaas — corrigir alinhamento da etapa 5

Em `src/components/settings/AsaasIntegration.tsx` (linhas 209–235):

**Causa**: a `<ol>` usa `list-inside` + `space-y-2`, e a etapa 5 contém um bloco `flex` aninhado seguido de outro `<div>` com chips, o que quebra a inline com o marcador "5." e empurra o conteúdo para a linha de baixo.

**Correção**: trocar `list-inside` por `list-outside pl-5` em toda a `<ol>` e remover o wrapper `<div className="flex items-start gap-1">` da etapa 5 (deixar o texto direto como `<span>`, igual às demais etapas):

```tsx
<ol className="space-y-2 list-decimal list-outside pl-5 text-muted-foreground">
  ...
  <li className="leading-relaxed">
    <span>⚠️ <strong>IMPORTANTE — Eventos para Cobranças:</strong> Marque estritamente estas opções:</span>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {/* chips */}
    </div>
  </li>
  ...
</ol>
```

Com `list-outside`, o número fica numa "gutter" fixa à esquerda e qualquer conteúdo block-level dentro do `<li>` (como o grid de chips) alinha-se corretamente sob o texto, sem deslocar o "5.".

## Ficheiros alterados
- `src/components/settings/ConexaIntegration.tsx` — substituir Accordion do webhook por Alert estilo Asaas.
- `src/components/settings/AsaasIntegration.tsx` — `list-outside pl-5` + simplificar wrapper da etapa 5.

Sem migração, sem mudança de lógica.

