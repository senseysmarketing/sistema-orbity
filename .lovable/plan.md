Vou ajustar o fluxo Conexa para garantir que a cobrança seja criada com o meio de faturamento Efí correto e que o sistema valide o resultado antes de salvar como emitido.

Plano:
1. Atualizar `create-gateway-charge` para tratar o boleto Efí como obrigatório quando `conexa_auto_generate_billet` estiver ativo:
   - enviar o `conexa_invoicing_method_id` no `POST /charge`;
   - registrar no log o corpo enviado para confirmar o `invoicingMethodId`;
   - após criar a cobrança, buscar os detalhes e falhar com mensagem clara se o Conexa retornar cobrança sem `billetUrl`.

2. Aplicar a mesma regra em `invoice-conexa-sale`, para o botão/manual de “Gerar Transação e Boleto”:
   - validar o meio de faturamento configurado;
   - criar cobrança com `invoicingMethodId`;
   - não marcar como boleto disponível se o Efí não tiver gerado a transação.

3. Tornar o cliente Conexa compartilhado mais tolerante à API real:
   - aceitar variações de resposta para URL do boleto;
   - melhorar a mensagem quando o Conexa cria fatura, mas não gera transação Efí.

4. Reimplantar as Edge Functions afetadas e validar pelos logs que o payload da cobrança contém o `invoicingMethodId` e que o erro muda de “Transação não gerada” para boleto/transação Efí disponível ou erro explicativo.