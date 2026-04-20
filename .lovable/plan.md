

# Botão de feedback WhatsApp na Central de Ajuda

## Mudança
Adicionar bloco fixo no final do `SheetContent` em `src/components/help/HelpCenter.tsx`, sempre visível abaixo das 3 abas (IA / Guias / Vídeos).

## Layout proposto
Card sutil (`border-t pt-4 mt-6`) com:
- Texto curto: **"Encontrou um bug ou tem uma sugestão? Seu feedback ajuda o Orbity a evoluir."**
- Botão verde WhatsApp (ícone SVG igual ao `WhatsAppFloatingButton.tsx`) → abre conversa em nova aba.

```
┌─────────────────────────────────────┐
│ 💬 Encontrou um bug ou sugestão?    │
│ Seu feedback ajuda o Orbity         │
│ a ficar cada vez melhor.            │
│                                      │
│ [  Enviar feedback no WhatsApp  ]   │
└─────────────────────────────────────┘
```

## Detalhes técnicos
- Reutilizar número/mensagem do `WhatsAppFloatingButton.tsx`:
  - `phoneNumber = "5516994481535"`
  - Mensagem dedicada: `"Olá! Quero enviar um feedback/reportar um bug no Orbity:"`
- `<a target="_blank" rel="noopener noreferrer">` com classes Tailwind verdes (`bg-green-500 hover:bg-green-600`).
- Posicionado **fora** das `<Tabs>`, garantindo presença em qualquer aba ativa.
- `SheetContent` já tem `overflow-y-auto`, então o bloco rola junto no final — sem `sticky`, mantém o estilo "Quiet Luxury" coerente com o resto da Central.

## Ficheiro alterado
- `src/components/help/HelpCenter.tsx` (adicionar bloco final + import do ícone WhatsApp inline SVG).

Sem migrations. Sem novas dependências.

