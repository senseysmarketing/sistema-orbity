

# Refatoracao do Painel de Clientes de Trafego — Lista Hibrida + Sheet Lateral

## Resumo
Substituir o grid de cards grandes por uma lista hibrida compacta (linhas horizontais com informacoes-chave) e mover todos os detalhes para um novo Sheet lateral que abre ao clicar no cliente.

## O que muda

### 1. Criar `src/components/traffic/ClientListRow.tsx`
Componente de linha compacta para cada cliente:
- Dot colorido (verde/amarelo/vermelho) indicando status de saude
- Nome do cliente (bold) + badge tipo conta (Pre/Pos-paga)
- Saldo principal ou Gasto do Mes (dependendo do tipo) — valor grande inline
- Badge de resultados (Excelentes/Bons/Medios/Ruins/Pessimos)
- Nome do gestor (ou "Sem gestor" em cinza)
- Indicador de ultima otimizacao (X dias, com cor laranja se >7)
- Botoes de acao: Refresh, Diario de Otimizacoes, Abrir Detalhes (chevron/seta)
- Linha inteira clicavel para abrir o Sheet
- Background sutil colorido por status (como hoje, mas mais discreto — apenas borda esquerda colorida)

### 2. Criar `src/components/traffic/ClientDetailSheet.tsx`
Sheet lateral (`side="right"`, `sm:max-w-[550px]`) com todas as informacoes que hoje estao no card + dialog de edicao, organizadas em secoes:

**Header**: Nome, ID, tipo de conta, badge status, badge resultados

**Secao Financeira**: 
- Saldo/Gasto detalhado (deposito, gasto, disponivel para pre-pagas)
- Alerta de saldo minimo, dias restantes estimados

**Secao Metricas**:
- Campanhas ativas, orcamento diario, gasto 7 dias, ultima otimizacao

**Secao Configuracao** (editavel inline):
- Select de resultados, select de gestor, input de saldo minimo

**Secao Comentarios**:
- Lista de comentarios + textarea para novo comentario

**Footer**: Botao salvar alteracoes

Tambem renderiza o `OptimizationSheet` (diario) a partir daqui.

### 3. Refatorar `src/components/traffic/ClientsPanel.tsx`
- Substituir o grid de `<ClientCard>` por uma lista de `<ClientListRow>`
- Adicionar state `selectedClient` e `isDetailSheetOpen`
- Renderizar `<ClientDetailSheet>` uma unica vez, controlado pelo state
- Manter todos os filtros, stats cards e logica de dados existentes intactos
- No mobile: linhas empilham verticalmente com layout responsivo

### 4. Manter `src/components/traffic/ClientCard.tsx`
- NAO deletar — manter para compatibilidade, mas nao sera mais usado pelo ClientsPanel
- Pode ser removido em iteracao futura

## Layout da Linha (desktop, ~1200px+)

```text
[●] Conecta Assescon Imoveis   [Pre-paga]   R$ 441,63   [Medios]   Gestor: Joao   ⏱ 0 dias   [↻] [📊] [→]
[▲] Edno Cordeiro Imoveis      [Pre-paga]   R$ 165,96   [Bons]     Sem gestor     ⏱ 8 dias   [↻] [📊] [→]
```

- Borda esquerda: verde (saudavel), amarela (atencao), vermelha (critico)
- Hover: bg sutil
- Se precisa otimizar (>7 dias): texto laranja + icone de alerta na coluna de otimizacao

## Arquivos
- `src/components/traffic/ClientListRow.tsx` (criar)
- `src/components/traffic/ClientDetailSheet.tsx` (criar)
- `src/components/traffic/ClientsPanel.tsx` (refatorar render de cards para lista)

