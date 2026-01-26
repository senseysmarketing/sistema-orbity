
# Correção: Scroll Vertical no Modal de Tarefas

## Problema Identificado

O `ScrollArea` do Radix UI não está funcionando porque precisa de uma altura **fixa** ou **calculada** no container pai, não apenas `max-height`. A estrutura atual está cortando o conteúdo sem mostrar a barra de scroll.

## Solução

Usar uma abordagem mais simples e confiável: aplicar `overflow-y-auto` diretamente em uma `div` com altura máxima definida, ao invés de depender do `ScrollArea` do Radix.

---

## Alterações Técnicas

### Arquivo: `src/pages/Tasks.tsx`

**Substituir o ScrollArea por uma div com overflow nativo:**

**Antes:**
```tsx
<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
  <DialogHeader>...</DialogHeader>
  <ScrollArea className="flex-1 max-h-[60vh] pr-4">
    <div className="grid gap-4 py-4">
      {/* campos do formulário */}
    </div>
  </ScrollArea>
  <DialogFooter>...</DialogFooter>
</DialogContent>
```

**Depois:**
```tsx
<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
  <DialogHeader className="flex-shrink-0">...</DialogHeader>
  <div className="flex-1 overflow-y-auto pr-2 min-h-0">
    <div className="grid gap-4 py-4">
      {/* campos do formulário */}
    </div>
  </div>
  <DialogFooter className="flex-shrink-0 pt-4 border-t">...</DialogFooter>
</DialogContent>
```

**Mudanças principais:**

1. **DialogContent**: Adicionar `overflow-hidden` para conter o conteúdo
2. **DialogHeader**: Adicionar `flex-shrink-0` para não encolher
3. **Container do formulário**: Usar `overflow-y-auto` nativo com `min-h-0` (necessário para flexbox)
4. **DialogFooter**: Adicionar `flex-shrink-0`, `pt-4` e `border-t` para separação visual

---

## Por que essa solução é melhor?

| Abordagem | Problema |
|-----------|----------|
| `ScrollArea` com `max-h` | Radix precisa de altura fixa, não funciona bem com flexbox |
| `overflow-y-auto` nativo | Funciona nativamente com CSS flexbox |

O truque é usar `min-h-0` no container scrollável - isso é necessário porque por padrão flex items têm `min-height: auto`, que impede o overflow de funcionar.

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Tasks.tsx` | Substituir ScrollArea por overflow-y-auto nativo nos dois modais (criação e edição) |

---

## Resultado Esperado

- Barra de scroll vertical aparece quando conteúdo excede a altura do modal
- Seção de "Anexos" sempre visível (com scroll)
- Botões "Cancelar" e "Atualizar" sempre visíveis no rodapé
- Funciona em qualquer tamanho de tela
