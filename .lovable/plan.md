# Corrigir novamente a inativação de clientes

## Diagnóstico confirmado

- A função `offboard_client` atualmente consulta `agency_users.is_active`, mas essa coluna não existe na tabela. Isso causa exatamente o erro exibido ao confirmar a desativação.
- A mesma validação usa cargos `administrador`, `super_admin` e `agency_admin`, enquanto a administração por agência utiliza `owner` e `admin`. Portanto, remover apenas a coluna inválida ainda deixaria usuários autorizados bloqueados.
- A tentativa com **Reference Home** foi revertida integralmente: o cliente continua ativo e a cobrança de **R$ 2.490,00**, com vencimento em **25/09/2026**, continua pendente e não foi marcada como preservada.

## Implementação

1. **Corrigir a autorização da operação**
   - Substituir a consulta manual incompatível pela validação já usada no sistema: pertencimento à agência e papel administrativo `owner/admin`.
   - Manter a operação restrita a administradores e vinculada à agência do cliente.

2. **Preservar a operação transacional**
   - Continuar validando que todas as cobranças informadas pertencem ao cliente e à mesma agência.
   - Cancelar somente as cobranças escolhidas como “Cancelar”.
   - Marcar como preservadas as cobranças escolhidas como “Manter”.
   - Inativar o cliente somente após todas as cobranças serem processadas; qualquer erro continuará revertendo tudo.

3. **Validar os caminhos reais**
   - Executar a inativação autenticada de um cliente com “Manter cobrança” e confirmar: cliente inativo, cobrança pendente e `preserved_after_deactivation = true`.
   - Confirmar que a cobrança permanece no fluxo de caixa.
   - Validar também “Cancelar cobrança” e reativação, sem duplicar lançamentos.
   - Confirmar que um usuário sem papel administrativo continua impedido.

4. **Repetir com segurança para Reference Home**
   - Após a correção, deixar o cliente disponível para uma nova tentativa pela tela; não alterar o cadastro nem a cobrança automaticamente antes dessa confirmação.

## Detalhes técnicos

- Criar uma migração que substitui a definição de `public.offboard_client`, usando `public.user_belongs_to_agency(...)` e `public.is_agency_admin(...)` em vez da coluna inexistente.
- Manter `SECURITY INVOKER`, RLS e a validação transacional existentes.
- Revisar o teste de regressão para cobrir a autorização e o resultado persistido da operação, além da visibilidade financeira já testada.
