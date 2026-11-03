# Fix Conexa: faturas sem boleto/Pix pagável

## O que os registros mostram

- **Até 02/10**: o mesmo pedido ao Conexa (Boleto Efí, meio nº 3) já voltava com o boleto pronto.
- **Desde 01/11**: as **21 faturas** do mês e as 4 que você tentou hoje (611 a 614) foram criadas, mas o Conexa responde `boleto: "notGenerated"`, sem conta vinculada. O pedido enviado pelo Orbity não mudou. Isso indica uma mudança do lado Conexa/Efí: o boleto passou a ser gerado depois, ou a integração do boleto Efí no Conexa caiu. O Pix do Efí continua funcionando: o Conexa devolve o código Pix normalmente.
- **Problema 1 (Orbity)**: o código Pix que o Conexa devolve **não fica salvo** nas faturas (todas aparecem sem Pix). Por isso o cliente não tem como pagar, nem por Pix.
- **Problema 2 (Orbity)**: a versão publicada da criação manual de cobrança está diferente do código atual. Ela mostra o erro vermelho e **descarta** a fatura no Orbity, mas a cobrança fica criada no Conexa. Por isso existem cobranças 611, 612, 613 e 614 de R$ 2.100 em duplicidade para o mesmo cliente no Conexa, sem vínculo no Orbity.
- **Problema 3 (Orbity)**: a verificação automática a cada 30 minutos roda, mas não consultou nenhuma cobrança nos últimos 5 dias. Por isso, mesmo que o Conexa gere o boleto depois, ele nunca chega ao Orbity.

## O que vou fazer

1. **Nunca perder a fatura**: quando o boleto não vier, a cobrança fica salva no Orbity como "boleto pendente", com o link da fatura e o Pix, em vez de mostrar erro e descartar. Vou republicar a função de criação.
2. **Salvar o Pix sempre**: corrigir a gravação do código Pix (copia e cola + QR Code) na criação, na geração automática e na verificação. Assim o cliente consegue pagar por Pix mesmo sem boleto.
3. **Buscar o boleto depois**: refazer a verificação automática a cada 30 minutos para reconsultar as faturas com "boleto pendente". Ela atualiza o link e a linha digitável assim que o Conexa/Efí gerar o boleto.
4. **Recuperar as faturas de novembro**: rodar essa verificação agora nas 21 faturas pendentes para trazer Pix e boleto (se já existir).
5. **Duplicadas 611 a 614**: vincular uma delas à fatura do cliente no Orbity e listar as outras para você cancelar no painel do Conexa. Eu não cancelo nada no Conexa sozinho.
6. **Mensagem clara na tela**: no lugar do erro vermelho, mostrar "Fatura criada. Boleto aguardando o Efí; Pix já disponível", com um botão "Atualizar boleto" na fatura.
7. **Teste**: um teste automático garante que uma resposta do Conexa sem boleto mas com Pix salva a fatura com o Pix e o status pendente.

## O que você precisa conferir no Conexa

O boleto em si depende do Conexa/Efí. Confira no painel do Conexa se o meio "Boleto Efí" continua conectado à conta Efí (credenciais e certificado válidos) e se a emissão automática de boleto está ativa. Se o boleto continuar sem ser gerado nem depois da verificação, o problema é dessa ligação.

## Detalhes técnicos

- Funções do servidor: `create-gateway-charge` (republicar; hoje a versão publicada difere do código), `_shared/billing-gateway.ts`, `reconcile-conexa-payments` e `_shared/conexa-client.ts`. Na resposta de `/charge/pix/:id` (array com `copyPasteCode`/`qrCode`), conferir por que `persistPaymentUpdates` não grava `conexa_pix_*`.
- `normalizeConexaChargeResponse`: ler `billet.digitableLine` e tratar `billet.status = notGenerated` como `charge_created_without_billet`.
- Reconcile: incluir `conexa_billing_status in ('charge_created','charge_created_without_billet')` e registrar em log quantas cobranças foram consultadas, para entender por que hoje não consulta nenhuma.
- Relink: atualizar `client_payments` com `conexa_charge_id`/`conexa_sale_id` da cobrança escolhida (cliente Conexa 134).
- Teste Deno em `_shared/conexa-client_test.ts`.
