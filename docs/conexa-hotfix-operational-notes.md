# Conexa: verificação após o hotfix

O status `generated` indica que a cobrança externa foi criada. O campo
`conexa_billing_status=charge_created_without_billet` indica que o boleto
ainda não está disponível. A reconciliação consulta `conexa_charge_id` para
completar boleto e Pix, sem criar outra venda ou cobrança.

## Exceções de novembro de 2026

- Há duas cobranças externas do mesmo cliente sem pagamentos locais. Uma
  pessoa responsável deve comparar cliente, valor, vencimento e situação de
  ambas no Conexa, decidir qual manter e aprovar expressamente qualquer
  vinculação ou cancelamento. Não reemitir.
- Há outra cobrança externa sem pagamento local correspondente para um cliente
  inativo. Auditar origem e situação antes de qualquer ação. Não reativar nem
  cancelar automaticamente.
- Os 21 pagamentos mensais Conexa de novembro têm IDs externos locais. A
  reconciliação por esses IDs pode enriquecer os registros após publicação;
  a disponibilidade do boleto depende de verificação operacional Conexa/Efí.

Em caso de resposta incerta após `POST /sale` ou `POST /charge`, o fluxo manual
marca a tentativa para auditoria e bloqueia outra criação externa até a
confirmação do ID. Não limpar essa marcação nem iniciar nova intenção sem
conferir o painel Conexa.
