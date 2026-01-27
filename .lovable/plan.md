
# Ajustes Mobile: Tabs de Configurações e Botão de Ajuda

## Problemas Identificados

| Problema | Local | Causa |
|----------|-------|-------|
| Tabs empilhadas | `Settings.tsx` | `TabsList` usa `flex-wrap` que quebra as tabs em múltiplas linhas no mobile |
| Botão de ajuda sobrepondo navegação | `HelpButton.tsx` | Posição fixa `bottom-6` conflita com a `MobileBottomNav` que tem altura de 64px (h-16) |

---

## Solução

### 1. Tabs de Configurações (`Settings.tsx`)

Aplicar o mesmo padrão já usado em `Index.tsx` e `CRM.tsx`: scroll horizontal com ícones e labels ocultos no mobile.

**Mudanças:**
- `TabsList` com `overflow-x-auto scrollbar-hide` em vez de `flex-wrap`
- Cada `TabsTrigger` com `flex-shrink-0` e ícone
- Labels ocultos no mobile via `hidden sm:inline`

```tsx
<TabsList className="flex w-full overflow-x-auto scrollbar-hide">
  <TabsTrigger value="profile" className="flex-shrink-0 gap-1 md:gap-2">
    <User className="h-4 w-4" />
    <span className="hidden sm:inline">Perfil</span>
  </TabsTrigger>
  <TabsTrigger value="subscription" className="flex-shrink-0 gap-1 md:gap-2">
    <CreditCard className="h-4 w-4" />
    <span className="hidden sm:inline">Assinatura</span>
  </TabsTrigger>
  {isAgencyAdmin && (
    <TabsTrigger value="users" className="flex-shrink-0 gap-1 md:gap-2">
      <Users className="h-4 w-4" />
      <span className="hidden sm:inline">Usuários</span>
    </TabsTrigger>
  )}
  <TabsTrigger value="integrations" className="flex-shrink-0 gap-1 md:gap-2">
    <Puzzle className="h-4 w-4" />
    <span className="hidden sm:inline">Integrações</span>
  </TabsTrigger>
  <TabsTrigger value="account" className="flex-shrink-0 gap-1 md:gap-2">
    <Shield className="h-4 w-4" />
    <span className="hidden sm:inline">Conta</span>
  </TabsTrigger>
  <TabsTrigger value="notifications" className="flex-shrink-0 gap-1 md:gap-2">
    <Bell className="h-4 w-4" />
    <span className="hidden sm:inline">Notificações</span>
  </TabsTrigger>
  <TabsTrigger value="appearance" className="flex-shrink-0 gap-1 md:gap-2">
    <Palette className="h-4 w-4" />
    <span className="hidden sm:inline">Aparência</span>
  </TabsTrigger>
</TabsList>
```

**Resultado Visual no Mobile:**
- Tabs em linha única com scroll horizontal
- Apenas ícones visíveis no mobile (economia de espaço)
- Labels aparecem em telas maiores (sm+)

---

### 2. Botão de Ajuda (`HelpButton.tsx`)

Ajustar posição para não sobrepor a navegação inferior no mobile.

**Mudanças:**
- No mobile: posicionar acima da navegação (`bottom-20`)
- No desktop: manter posição original (`bottom-6`)
- Usar classes responsivas

```tsx
<Button
  onClick={() => setIsOpen(true)}
  size="icon"
  className="fixed bottom-20 md:bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
  aria-label="Abrir central de ajuda"
>
```

**Cálculo:**
- Navegação inferior: 64px (h-16) + safe-area
- Margem: 16px (bottom-20 = 80px, que é 64px + 16px de margem)

---

## Resumo de Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Settings.tsx` | TabsList com scroll horizontal e ícones |
| `src/components/help/HelpButton.tsx` | Posição responsiva do botão |

---

## Resultado Esperado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Tabs | Empilhadas em 3 linhas | Scroll horizontal em 1 linha |
| Identificação de tabs | Apenas texto | Ícone + texto (mobile só ícone) |
| Botão de ajuda | Sobrepondo navegação | Acima da navegação no mobile |
