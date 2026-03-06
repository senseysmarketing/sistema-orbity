

# Resumo Semanal Compacto para WhatsApp

## Problema

O formato atual do resumo semanal e muito extenso para WhatsApp -- inclui tema, formato, plataforma em linhas separadas por post, tornando a mensagem longa demais para comunicacao rapida com o cliente.

## Solucao

Substituir o formato atual por um formato compacto e padronizado, otimizado para WhatsApp. Cada post ocupa uma unica linha com emojis indicando formato e dia. Sem necessidade de IA -- o formato e deterministico e consistente.

### Exemplo do novo formato

```
Ola! Segue o planejamento de conteudo da semana para *ClienteX* 📱

*Semana 1 (03/03 a 09/03) - 5 posts*

📅 Seg 03/03 — 🎠 Dicas de produtividade
📅 Ter 04/03 — 🎬 Bastidores do escritorio
📅 Qua 05/03 — 📸 Case de sucesso cliente Y
📅 Sex 07/03 — 🎠 5 erros no marketing digital
📅 Dom 09/03 — 🎬 Trend da semana

Qualquer ajuste e so me chamar! ✅
```

### Detalhes tecnicos

**Arquivo: `src/components/social-media/planning/WeeklySummaryDialog.tsx`**

Reescrever a funcao `generateSummaryText` com formato compacto:

1. Nome do cliente em negrito com asteriscos (formatacao WhatsApp)
2. Header de semana em negrito, uma linha, com contagem
3. Cada post em uma unica linha: emoji do dia + data curta + emoji do formato + titulo
4. Emojis por formato: carrossel = 🎠, reels = 🎬, feed = 📸, stories = 📱, video = 🎥
5. Fechamento padrao curto
6. Remover linhas de "Tema", "Formato", "Plataforma" separadas -- tudo condensado

### Mapeamento de emojis por formato

| Formato | Emoji |
|---------|-------|
| carrossel | 🎠 |
| reels | 🎬 |
| feed | 📸 |
| stories | 📱 |
| video | 🎥 |
| (outro/sem) | 📌 |

### Resultado esperado

- Mensagem ~60-70% menor que o formato atual
- Visualmente escaneavel no WhatsApp
- Formato padrao e consistente sem depender de IA
- Mantém todas as informacoes essenciais (dia, formato, titulo)

