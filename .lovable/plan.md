
# Otimizacao Mobile: Abas de Integracoes e Notificacoes (Settings)

## Problemas Identificados (Screenshots)

### Aba de Integracoes (Primeiro Screenshot)
| Problema | Componente | Causa |
|----------|------------|-------|
| Textos quebrando em lugares errados | `GoogleCalendarIntegration.tsx` linhas 71-87 | Header com `flex items-center gap-3` que nao stack no mobile |
| "Calendario para sincronizacao" texto muito longo | Linha 105-110 | Layout horizontal `justify-between` que nao se adapta |
| Select muito largo + botao | Linha 112-159 | `w-[220px]` fixo que extravasa |
| "Importar eventos do Google" texto quebrado | Linhas 176-208 | Mesmo problema do layout horizontal |
| Botoes footer cortados | Linhas 211-229 | `flex gap-2` sem wrap |

### Aba de Notificacoes (Segundo Screenshot)
| Problema | Componente | Causa |
|----------|------------|-------|
| Header "Minhas Notificacoes" apertado | `NotificationSummaryCard.tsx` linha 85-98 | Titulo e botao em linha unica |
| Email cortado "contato@orbity..." | `EmailIntegration.tsx` linhas 98-104 | `flex justify-between` sem truncate |
| Texto "Como funciona" cortado | Linhas 109-118 | Lista sem ajuste mobile |
| Descricoes longas cortando | Todos os cards | Textos sem responsividade |

---

## Solucao

### 1. GoogleCalendarIntegration.tsx - Header Responsivo

**Antes:**
```tsx
<div className="flex items-center gap-3">
  <div className="flex h-10 w-10 ...">
    <Calendar ... />
  </div>
  <div className="flex-1">
    <CardTitle className="text-lg">Google Calendar</CardTitle>
    <CardDescription>Sincronize suas reunioes...</CardDescription>
  </div>
  {isConnected && <Badge>Conectado</Badge>}
</div>
```

**Depois:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center gap-3">
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <CardTitle className="text-base sm:text-lg">Google Calendar</CardTitle>
        {isConnected && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 flex-shrink-0">
            <Check className="mr-1 h-3 w-3" />
            Conectado
          </Badge>
        )}
      </div>
      <CardDescription className="text-xs sm:text-sm">
        Sincronize suas reunioes com o Google Calendar e gere links do Google Meet
      </CardDescription>
    </div>
  </div>
</div>
```

---

### 2. GoogleCalendarIntegration.tsx - Secoes de Configuracao Responsivas

Ajustar todas as secoes de configuracao para stack vertical no mobile:

**Calendario para sincronizacao:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg">
  <div className="space-y-1 min-w-0">
    <p className="text-sm font-medium">Calendario</p>
    <p className="text-xs sm:text-sm text-muted-foreground">
      <span className="hidden sm:inline">Selecione qual calendario sera usado para criar e importar eventos</span>
      <span className="sm:hidden">Calendario usado para sincronizacao</span>
    </p>
  </div>
  <div className="flex items-center gap-2 flex-shrink-0">
    <Select ...>
      <SelectTrigger className="w-full sm:w-[200px]">
        ...
      </SelectTrigger>
    </Select>
    <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
      <RefreshCw ... />
    </Button>
  </div>
</div>
```

**Sincronizacao automatica:**
```tsx
<div className="flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
  <div className="space-y-1 min-w-0 flex-1">
    <p className="text-sm font-medium">Sincronizacao automatica</p>
    <p className="text-xs sm:text-sm text-muted-foreground">
      <span className="hidden sm:inline">Sincronizar reunioes automaticamente ao criar, editar ou excluir</span>
      <span className="sm:hidden">Sincronizar automaticamente</span>
    </p>
  </div>
  <Switch ... className="flex-shrink-0" />
</div>
```

**Importar eventos:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg">
  <div className="space-y-1 min-w-0">
    <p className="text-sm font-medium">Importar eventos</p>
    <p className="text-xs sm:text-sm text-muted-foreground">
      <span className="hidden sm:inline">Importe eventos existentes do calendario selecionado para o Orbity</span>
      <span className="sm:hidden">Importar do Google Calendar</span>
    </p>
  </div>
  <div className="flex items-center gap-2 flex-shrink-0">
    <Select value={importDays} onValueChange={setImportDays}>
      <SelectTrigger className="w-[130px] sm:w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">7 dias</SelectItem>
        <SelectItem value="14">14 dias</SelectItem>
        <SelectItem value="30">30 dias</SelectItem>
        <SelectItem value="60">60 dias</SelectItem>
      </SelectContent>
    </Select>
    <Button variant="outline" size="sm" ...>
      {importEvents.isPending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-4 w-4" />
      )}
      <span className="hidden sm:inline">Importar</span>
      <span className="sm:hidden">Imp.</span>
    </Button>
  </div>
</div>
```

**Botoes footer:**
```tsx
<div className="flex flex-col sm:flex-row gap-2">
  <Button variant="outline" size="sm" ... className="w-full sm:w-auto">
    <ExternalLink className="mr-2 h-4 w-4" />
    <span className="hidden sm:inline">Abrir Google Calendar</span>
    <span className="sm:hidden">Abrir</span>
  </Button>
  <Button variant="destructive" size="sm" ... className="w-full sm:w-auto">
    <Unlink className="mr-2 h-4 w-4" />
    Desconectar
  </Button>
</div>
```

---

### 3. NotificationSummaryCard.tsx - Header Responsivo

**Antes:**
```tsx
<CardTitle className="flex items-center justify-between">
  <span className="flex items-center gap-2">
    <Bell className="h-5 w-5" />
    Minhas Notificacoes
  </span>
  <Button>Configurar</Button>
</CardTitle>
```

**Depois:**
```tsx
<CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
  <span className="flex items-center gap-2">
    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
    <span className="text-base sm:text-lg">Minhas Notificacoes</span>
  </span>
  <Button
    variant="outline"
    size="sm"
    onClick={() => setPreferencesOpen(true)}
    className="gap-2 w-full sm:w-auto"
  >
    <Settings className="h-4 w-4" />
    Configurar
  </Button>
</CardTitle>
```

---

### 4. EmailIntegration.tsx - Layout Responsivo

**Header com Switch responsivo:**
```tsx
<CardHeader className="p-4 sm:p-6">
  <div className="flex items-start sm:items-center justify-between gap-3">
    <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
      <Mail className="h-4 w-4 sm:h-5 sm:w-5 mt-1 sm:mt-0 flex-shrink-0" />
      <div className="min-w-0">
        <CardTitle className="text-base sm:text-lg">
          <span className="hidden sm:inline">Notificacoes por Email</span>
          <span className="sm:hidden">Email</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Envie notificacoes via email
        </CardDescription>
      </div>
    </div>
    <Switch ... className="flex-shrink-0" />
  </div>
</CardHeader>
```

**Informacoes do Remetente com truncate:**
```tsx
<div className="rounded-md bg-muted p-3 sm:p-4 space-y-2">
  <p className="text-xs sm:text-sm font-medium">Informacoes do Remetente</p>
  <div className="space-y-1 text-xs sm:text-sm">
    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
      <span className="text-muted-foreground">Remetente:</span>
      <span className="font-medium">Orbity</span>
    </div>
    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
      <span className="text-muted-foreground">Email:</span>
      <span className="font-medium truncate">contato@orbityapp.com.br</span>
    </div>
  </div>
</div>
```

**"Como funciona" com texto compacto:**
```tsx
<div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-3 space-y-2">
  <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100">
    Como funciona
  </p>
  <ul className="text-[10px] sm:text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-3 sm:ml-4 list-disc">
    <li>
      <span className="hidden sm:inline">Os emails serao enviados via Resend usando o dominio da Orbity</span>
      <span className="sm:hidden">Emails via Resend (Orbity)</span>
    </li>
    <li>
      <span className="hidden sm:inline">Cada usuario configura seu email pessoal nas preferencias</span>
      <span className="sm:hidden">Configure seu email pessoal</span>
    </li>
    <li>
      <span className="hidden sm:inline">Usuarios escolhem quais tipos de notificacao querem receber</span>
      <span className="sm:hidden">Escolha os tipos de notificacao</span>
    </li>
  </ul>
</div>
```

---

### 5. NotificationChannelsConfig.tsx - Grid Responsivo

```tsx
export function NotificationChannelsConfig() {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
      <EmailIntegration />
      <DiscordIntegration />
      <SlackIntegration />
      <CustomWebhookIntegration />
    </div>
  );
}
```

---

### 6. DiscordIntegration.tsx, SlackIntegration.tsx, CustomWebhookIntegration.tsx - Padronizacao

Aplicar os mesmos ajustes de padding e tipografia responsivos:

**Headers:**
- Adicionar `className="p-4 sm:p-6"` ao CardHeader
- Ajustar titulos para `text-base sm:text-lg`
- CardDescription `text-xs sm:text-sm`

**Toggle sections:**
```tsx
<div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
  <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
    <h4 className="text-sm font-medium">Ativar Discord</h4>
    <p className="text-xs sm:text-sm text-muted-foreground">
      <span className="hidden sm:inline">Habilitar envio de notificacoes via Discord</span>
      <span className="sm:hidden">Enviar notificacoes via Discord</span>
    </p>
  </div>
  <Switch ... className="flex-shrink-0" />
</div>
```

**Botoes de acao:**
```tsx
<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
  <Button onClick={handleSave} disabled={loading} className="flex-1">
    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
    <span className="hidden sm:inline">Salvar Configuracao</span>
    <span className="sm:hidden">Salvar</span>
  </Button>
  <Button onClick={testWebhook} ... variant="outline" className="flex-1 sm:flex-none">
    ...
    <span className="hidden sm:inline">Testar Webhook</span>
    <span className="sm:hidden">Testar</span>
  </Button>
</div>
```

---

## Arquivos a Modificar

| Arquivo | Mudancas |
|---------|----------|
| `src/components/settings/GoogleCalendarIntegration.tsx` | Header responsivo, secoes com stack vertical mobile, selects/botoes adaptados |
| `src/components/notifications/NotificationSummaryCard.tsx` | Header responsivo, botao full-width mobile |
| `src/components/notifications/NotificationChannelsConfig.tsx` | Grid cols-1 no mobile |
| `src/components/notifications/integrations/EmailIntegration.tsx` | Header compacto, texto truncado, lista abreviada |
| `src/components/notifications/integrations/DiscordIntegration.tsx` | Toggle/botoes responsivos |
| `src/components/notifications/integrations/SlackIntegration.tsx` | Toggle/botoes responsivos |
| `src/components/notifications/integrations/CustomWebhookIntegration.tsx` | Toggle/botoes responsivos |

---

## Resultado Visual (Mobile)

### Aba Integracoes - Antes vs Depois
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ 📅 Google         │           │ 📅 Google Calendar│
│    Calendar       │           │ ✓ Conectado       │
│    Sincronize...  │           │ Sincronize suas...│
│ ✓Conectado        │           ├───────────────────┤
├───────────────────┤           │ Calendario        │
│ Calendario        │           │ Cal para sinc...  │
│ para              │           │ [Calendar Princ.]▼│
│ sincronizacao     │           ├───────────────────┤
│ Selecione qual    │           │ Sinc. automatica  │
│ calendario        │           │ [✓]               │
│ sera usado...     │           ├───────────────────┤
│ [Calendar Princ.] │           │ Importar eventos  │
└───────────────────┘           │ [30d▼][Importar]  │
                                └───────────────────┘
```

### Aba Notificacoes - Antes vs Depois
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│🔔Minhas    [Conf.]│           │ 🔔 Minhas Notif.  │
│ Notificacoes      │           │ [  Configurar   ] │
├───────────────────┤           ├───────────────────┤
│ Email: contato@or │           │ Remetente: Orbity │
│ bityapp...  ← cut │           │ Email:            │
├───────────────────┤           │ contato@orbity... │
│ • Os emails serao │           ├───────────────────┤
│ enviados via Res  │           │ Como funciona     │
│ end usando o dom  │           │ • Emails via Rese │
│ inio da Orb ←cut  │           │ • Configure email │
└───────────────────┘           │ • Escolha tipos   │
                                └───────────────────┘
```

---

## Resumo das Mudancas

| Componente | Antes | Depois |
|------------|-------|--------|
| GCal Header | Linha unica horizontal | Stack com badge inline |
| GCal Secoes | `justify-between` horizontal | Stack vertical mobile |
| GCal Selects | `w-[220px]` fixo | `w-full sm:w-[200px]` |
| GCal Botoes footer | `flex gap-2` inline | `flex-col sm:flex-row` |
| Notif Summary Header | Titulo+botao em linha | Stack vertical mobile |
| Email Info | `justify-between` | `flex-col sm:flex-row` |
| Email "Como funciona" | Texto completo | Versao curta mobile |
| Integracao Cards | `grid-cols-2` | `grid-cols-1 md:grid-cols-2` |
| Todos os toggles | Descricao completa | Versao curta mobile |
| Botoes de acao | Inline horizontal | Stack vertical mobile |
