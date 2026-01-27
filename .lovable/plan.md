
# Padronizar Header e Filtros do Social Media Kanban

## Objetivo

Ajustar o layout da aba Kanban do Social Media para seguir o mesmo padrão visual da página de Gestão de Tarefas, incluindo:

1. Header com título e descrição à esquerda, botões à direita
2. Campo de busca de posts em linha própria
3. Linha de filtros abaixo do campo de busca

---

## Layout Atual vs Desejado

| Elemento | Atual (PostKanban) | Desejado (igual Tasks) |
|----------|-------------------|------------------------|
| Header | Apenas título "Kanban de Produção" | Removido do componente (será no pai) |
| Botão Novo | Na linha do título | No header da página |
| Campo de Busca | Não existe | Linha própria com ícone de busca |
| Filtros | Primeira linha | Segunda linha, abaixo da busca |

---

## Mudanças Propostas

### 1. Página SocialMedia.tsx

Atualizar o header da página para incluir:
- Título "Social Media Planner" com descrição (já existe)
- Botão "Novo Post" ao lado direito do header (mover de dentro do PostKanban)
- Possível dropdown de Templates de Posts (se existir)

```text
+------------------------------------------------------------------+
|  Social Media Planner                    [Templates ▼] [+ Novo Post]
|  Gerencie todo o workflow...                                      |
+------------------------------------------------------------------+
|  [Calendário] [Kanban] [Análises] [Configurações]                |
+------------------------------------------------------------------+
```

### 2. Componente PostKanban.tsx

Ajustar a estrutura interna para:
- Remover o header com título (será tratado na página pai)
- Adicionar campo de busca em linha própria
- Manter filtros na segunda linha

```text
+------------------------------------------------------------------+
| [🔍 Buscar posts...]                                              |  <- Nova linha
+------------------------------------------------------------------+
| [⚙] [Clientes ▼] [Usuários ▼] [Tipo ▼] [Período ▼] [Ordenar ▼] [X] <- Filtros
+------------------------------------------------------------------+
| [Briefing] [Em Criação] [Aguardando Aprovação] [Aprovado] ...     |
+------------------------------------------------------------------+
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/SocialMedia.tsx` | Adicionar botão "Novo Post" no header principal, gerenciar estado do dialog de criação |
| `src/components/social-media/PostKanban.tsx` | Remover título interno, adicionar campo de busca, ajustar layout dos filtros |

---

## Detalhes Técnicos

### SocialMedia.tsx

```tsx
// Estado para controlar o dialog de criação
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

// Header atualizado
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Social Media Planner</h1>
    <p className="text-sm md:text-base text-muted-foreground">
      Gerencie todo o workflow de criação de conteúdo para redes sociais
    </p>
  </div>
  <div className="flex items-center gap-2">
    <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2 h-9">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Novo Post</span>
    </Button>
  </div>
</div>
```

### PostKanban.tsx

```tsx
// Adicionar estado de busca
const [searchTerm, setSearchTerm] = useState("");

// Filtrar por termo de busca
const filteredPosts = useMemo(() => {
  let filtered = posts;
  
  // Filtro de busca por título ou descrição
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(post => 
      post.title?.toLowerCase().includes(term) ||
      post.description?.toLowerCase().includes(term) ||
      post.clients?.name?.toLowerCase().includes(term)
    );
  }
  
  // ... demais filtros existentes
}, [posts, searchTerm, filterClient, ...]);

// Layout atualizado (sem o header interno)
<div className="space-y-3 md:space-y-4 h-full flex flex-col">
  {/* Linha 1: Campo de Busca */}
  <div className="relative flex-shrink-0">
    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Buscar posts..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-8"
    />
  </div>

  {/* Linha 2: Filtros */}
  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 flex-shrink-0">
    <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    {/* ... filtros existentes ... */}
  </div>

  {/* Kanban columns */}
  <div className="flex-1 overflow-hidden">
    ...
  </div>
</div>
```

---

## Interface Resultante

```text
┌──────────────────────────────────────────────────────────────────┐
│  Social Media Planner                              [+ Novo Post] │
│  Gerencie todo o workflow de criação de conteúdo...              │
├──────────────────────────────────────────────────────────────────┤
│  [📅 Calendário] [⊞ Kanban] [📈 Análises] [⚙ Configurações]     │
├──────────────────────────────────────────────────────────────────┤
│  🔍 Buscar posts...                                              │
├──────────────────────────────────────────────────────────────────┤
│  ⚙ [Clientes ▼] [Tipo ▼] [Usuários ▼] [Período ▼] [Ordenar ▼]   │
├──────────────────────────────────────────────────────────────────┤
│  Briefing    │ Em Criação │ Aguard. Aprovação │ Aprovado │ ...  │
│  ┌─────────┐ │ ┌─────────┐│ ┌─────────────┐   │ ...      │      │
│  │ Post 1  │ │ │ Post 2  ││ │ Post 3      │   │          │      │
│  └─────────┘ │ └─────────┘│ └─────────────┘   │          │      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Comunicacao entre Componentes

O botao "Novo Post" sera movido para o header da pagina `SocialMedia.tsx`. Existem duas abordagens para comunicar com o `PostKanban`:

**Opcao A - Props (recomendada)**: Passar props para controlar o dialog
```tsx
<PostKanban 
  isCreateDialogOpen={isCreateDialogOpen} 
  onCreateDialogOpenChange={setIsCreateDialogOpen} 
/>
```

**Opcao B - Manter no Kanban**: Manter o dialog dentro do PostKanban e expor uma ref/callback

Vou usar a Opcao A por ser mais clara e seguir o padrao da pagina Tasks.
