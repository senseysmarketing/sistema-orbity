

# Persistir Historico de Legendas no localStorage

## Resumo

O historico de legendas geradas atualmente fica apenas em estado local (useState), sendo perdido ao sair da tela. A solucao e persistir no `localStorage` com limite de 5 itens.

## Arquivo Modificado

### `src/components/social-media/CaptionGenerator.tsx`

- Criar uma chave de localStorage baseada no `agency_id`: `caption-history-{agencyId}`
- Inicializar o estado `history` lendo do localStorage (com `JSON.parse` + fallback para array vazio)
- Ao adicionar nova legenda ao historico, salvar no localStorage limitando a 5 itens (`.slice(0, 5)`)
- Usar `useEffect` para sincronizar o estado com o localStorage sempre que `history` mudar
- Converter as datas (timestamp) corretamente ao carregar do localStorage (pois `JSON.parse` retorna strings)

## Detalhes

- Chave no localStorage: `caption-history-{currentAgency.id}` para separar por agencia
- Limite de 5 legendas no historico (as mais recentes)
- Ao gerar nova legenda, adiciona no inicio e corta as mais antigas se exceder 5

