## Diagnóstico

O erro não está na seleção visual. O Conexa retornou o meio corretamente, mas a UI está lendo o campo errado da resposta:

- A API do Conexa retornou: `invoicingMethodId: 3`, `name: Boleto Efi`, `type: billet`.
- O componente espera `id`, então salva `id` como `NaN/null`.
- No banco ficou: `conexa_invoicing_method_name = 'Boleto Efi'`, mas `conexa_invoicing_method_id = null`.
- Por isso a Edge Function bloqueia a geração do boleto com 422 antes de chamar `POST /charge`.

## Plano de correção

1. **Normalizar resposta da listagem de meios**
   - Ajustar `_shared/conexa-client.ts` para aceitar tanto `id` quanto `invoicingMethodId` ao montar a lista.
   - Garantir que o frontend sempre receba `id: 3` quando a API retornar `invoicingMethodId: 3`.

2. **Proteger o salvamento no frontend**
   - Ajustar `ConexaIntegration.tsx` para não permitir salvar um meio sem ID numérico válido.
   - Ao buscar meios, se houver o meio salvo por nome/tipo, selecionar automaticamente o ID correto encontrado.
   - Melhorar o estado visual para mostrar claramente quando o ID está válido.

3. **Aplicar correção imediata nos dados atuais**
   - Rodar uma migration pontual para atualizar a agência afetada:
     - `conexa_invoicing_method_id = 3`
     - manter `conexa_invoicing_method_name = 'Boleto Efi'`
     - manter `conexa_invoicing_method_type = 'billet'`
   - Isso corrige o ambiente atual sem depender de você refazer manualmente a seleção.

4. **Reimplantar funções Conexa afetadas**
   - Reimplantar `conexa-list-invoicing-methods`, `create-gateway-charge` e `invoice-conexa-sale`.
   - Validar que a próxima geração envia `invoicingMethodId: 3` no `POST /charge`.

## Resultado esperado

Após a correção, a configuração passará a ter ID real do Meio de Faturamento e a cobrança Conexa será criada com `invoicingMethodId`, permitindo que o boleto Efí seja gerado automaticamente.