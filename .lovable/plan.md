## Diagnóstico

As credenciais Conexa **continuam salvas no banco** (subdomínio `senseys`, company_id 3, unit_id 3, product 2121, token presente, `conexa_enabled = true`). O problema está **só no carregamento do formulário** após a última refatoração.

### Causa raiz

No `usePaymentGateway`, criamos `stableSettings` que **sempre retorna um objeto não-nulo** (usa `defaultSettings` quando ainda não chegou do banco):

```ts
const stableSettings = useMemo(() => {
  return settings ?? { ...defaultSettings, id: '', agency_id: agencyId || '' }
}, [settings, agencyId]);
```

No `ConexaIntegration.tsx`, o `useEffect` de inicialização usa um `useRef` que trava após a primeira execução:

```ts
useEffect(() => {
  if (settings && !initialized.current) {
    setApiKey(settings.conexa_api_key || "");
    ...
    initialized.current = true;     // <- trava aqui
  }
}, [settings]);
```

Sequência do bug:
1. Primeiro render: `settings` já é truthy (defaults vazios) → effect roda, popula tudo com `""`, marca `initialized = true`.
2. Query termina: `settings` agora tem os dados reais → effect roda de novo, mas `initialized.current` já é `true` → **ignora os dados reais**.
3. Resultado: usuário vê todos os campos vazios e badge "Desconectado".

Isso também explica o erro em "Buscar meios de faturamento": o botão valida `apiKey` e `subdomain` do **estado do formulário** (vazios), retornando "Configure subdomínio e token primeiro".

E o salvar "não fica salvo": como o formulário foi populado com `null`/`""`, ao clicar em Salvar você sobrescreveria as credenciais com vazio. (Se você não salvou ainda, os dados continuam intactos no banco — confirmado pela query.)

## Plano

Arquivo único: `src/components/settings/ConexaIntegration.tsx`.

1. **Trocar a trava por `useRef`** por uma condição baseada no `id` real da linha:
   - Substituir `initialized = useRef(false)` por `lastLoadedId = useRef<string | null>(null)`.
   - O effect só popula quando `settings?.id` muda e é diferente do `lastLoadedId.current` (ou seja, quando dados reais chegaram).
   - Isso evita popular com defaults vazios e re-popula corretamente em troca de agência.

2. **Não rodar o effect quando `isLoading` é true**, como salvaguarda extra.

3. **Validação do botão "Buscar meios de faturamento"**: continua olhando o estado do formulário (correto), mas após o fix acima ele já terá os valores reais.

Nenhuma mudança de schema, edge function ou hook — o problema é puramente de hidratação do form.

## Verificação após implementar

- Recarregar `/dashboard/settings?tab=ops` → campos devem aparecer preenchidos (subdomínio `senseys`, token mascarado, unit 3, product 2121, company 3).
- Badge deve mostrar "Conectado".
- "Buscar meios de faturamento" deve chamar a edge function sem erro de validação local.
