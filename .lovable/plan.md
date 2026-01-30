

# Correção: Layout das Abas de Configurações no Mobile

## Problema

Na tela de Configurações (`/dashboard/settings`), as abas estão aparecendo desalinhadas em 2 linhas no mobile, como mostra o screenshot. Isso ocorre porque o layout usa `grid grid-cols-3` que força 3 colunas, mas com 6-7 abas, o resultado fica visualmente quebrado.

## Solução

Seguir o mesmo padrão já utilizado em `SocialMediaSettings` e `CRMSettings`:
- No **mobile**: usar `flex` com `overflow-x-auto` para permitir scroll horizontal
- No **desktop**: manter o layout de grid com `md:grid md:grid-cols-7`

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Settings.tsx` | Ajustar TabsList para usar flex no mobile e grid no desktop |

---

## Implementação

### Mudança na linha 242

**Antes:**
```tsx
<TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
```

**Depois:**
```tsx
<TabsList className="flex w-full overflow-x-auto scrollbar-hide md:grid md:grid-cols-7">
```

---

## Comportamento Final

| Dispositivo | Layout |
|-------------|--------|
| Mobile | Abas em linha horizontal com scroll lateral |
| Desktop | Abas em grid de 7 colunas preenchendo largura total |

A mudança afeta **apenas** o layout mobile, mantendo o desktop exatamente como está (grid de 7 colunas).

