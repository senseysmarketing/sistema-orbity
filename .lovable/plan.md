
# Padronização Visual das Abas (TabsList)

## Problema Identificado

As páginas de CRM e Configurações usam um padrão diferente para as abas que resulta em um visual diferente do desejado (primeiro print).

| Tela | Padrão Atual | Visual |
|------|--------------|--------|
| **Tasks** | `grid w-full grid-cols-3` | Preenchido (correto) |
| **CRM** | `flex w-full overflow-x-auto` | Abas estreitas (incorreto) |
| **Settings** | `flex w-full overflow-x-auto` | Abas estreitas (incorreto) |

## Solução

Alterar o `TabsList` nas duas páginas para usar o padrão de grid, que distribui as abas igualmente preenchendo todo o container.

---

## Arquivos a Modificar

### 1. `src/pages/CRM.tsx` (linha 354)

**Antes:**
```tsx
<TabsList className="flex w-full overflow-x-auto scrollbar-hide lg:w-auto">
```

**Depois:**
```tsx
<TabsList className="grid w-full grid-cols-3 lg:w-auto">
```

O CRM tem 3 abas (Dashboard, Pipeline, Configuracoes), entao usamos `grid-cols-3`.

---

### 2. `src/pages/Settings.tsx` (linha 190)

**Antes:**
```tsx
<TabsList className="flex w-full overflow-x-auto scrollbar-hide">
```

**Depois:**
```tsx
<TabsList className="grid w-full grid-cols-4 md:grid-cols-7">
```

Settings tem 7 abas no total (Perfil, Assinatura, Usuarios, Integracoes, Conta, Notificacoes, Aparencia). Porem, como "Usuarios" so aparece para admins, usaremos uma abordagem que funcione para ambos os casos. O grid de 7 colunas no desktop garante espacamento igual, e 4 no mobile para que caiba sem ficar apertado demais.

Alternativa mais simples: usar `grid-cols-3 md:grid-cols-7` que se adapta melhor.

---

## Resultado Esperado

Apos as alteracoes, as abas em CRM e Configuracoes terao o mesmo estilo visual da pagina de Tarefas: fundo preenchido com as abas distribuidas uniformemente ocupando toda a largura disponivel.

---

## Detalhes Tecnicos

O componente `TabsList` da biblioteca Radix UI/shadcn aceita classes Tailwind normalmente. O uso de `grid` com `grid-cols-N` forca cada aba a ocupar uma fracao igual do espaco, enquanto `flex` deixa cada aba com sua largura natural baseada no conteudo.
