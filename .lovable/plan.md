

# Reescrita do LandingFooter: Rodapé Institucional Light Mode

## Contexto
- O ficheiro `orbity-logo.png` existe em `src/assets/` -- será utilizado com import direto
- As rotas legais atuais apontam todas para `/privacy-policy` -- serão corrigidas para `href="#"` como placeholders seguros

## Alterações em `src/components/landing/LandingFooter.tsx` -- Reescrita completa

### Imports
- Remover: `Facebook`, `Twitter`, `motion`
- Manter: `Instagram`, `Linkedin` (de `lucide-react`)
- Adicionar: `import orbityLogo from "@/assets/orbity-logo.png"`
- Manter: `useNavigate` (para links internos como `#features`, `#pricing`)

### Estrutura

**1. Fundo e borda**
- `<footer className="bg-white border-t border-slate-200">`

**2. Grid principal (4 colunas)**
- Container: `max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12`

**Coluna 1 -- Marca:**
- Logo: `<img src={orbityLogo} alt="Orbity" className="h-8" />`
- Subtítulo: "O padrão operacional das agências de elite." -- `text-sm text-slate-500 mt-4`
- Ícones: `Instagram`, `Linkedin` em `text-slate-400 hover:text-purple-600 transition-colors`

**Coluna 2 -- Produto:**
- Título: "Produto" (`font-semibold text-slate-900 mb-4`)
- Links (`text-slate-600 hover:text-slate-900 transition-colors`):
  - Funcionalidades (`#features`), Integrações (`#integrations`), Preços (`#pricing`), Atualizações (`#`)

**Coluna 3 -- Empresa:**
- Links: Sobre nós, Contato, Programa de Parceiros (todos `href="#"`)

**Coluna 4 -- Legal:**
- Termos de Uso: `href="#"` (placeholder)
- Política de Privacidade: `href="#"` (placeholder)
- Central de Ajuda: `href="#"`

**3. Barra de compliance**
- Container: `max-w-7xl mx-auto px-4 pb-8`
- Linha: `pt-8 mt-0 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400`
- Esquerda: "© 2026 Orbity (by Senseys). Todos os direitos reservados."
- Centro: "CNPJ: 51.912.584/0001-02"
- Direita: "Desenvolvido com tecnologia de ponta no Brasil."

### Ficheiro alterado
- `src/components/landing/LandingFooter.tsx` -- reescrita completa

