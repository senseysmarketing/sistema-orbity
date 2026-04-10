

# Refatoracao Visual do ClientForm.tsx

## Resumo
Reestruturar o layout do modal de cliente em 3 secoes visuais com hierarquia clara, modal mais largo, scroll interno, e campos reagrupados em grids otimizados.

## Alteracoes (arquivo unico: `src/components/admin/ClientForm.tsx`)

### 1. Modal e ScrollArea
- `DialogContent`: alterar classe para `sm:max-w-2xl` (de `max-w-[600px]`)
- Importar `ScrollArea` de `@/components/ui/scroll-area`
- Envolver o conteudo do form com `<ScrollArea className="max-h-[80vh] px-1">`

### 2. Secao 1 — Dados Principais
Titulo: `"Dados Principais"` (`h3 text-sm font-medium text-muted-foreground`)
- Grid 2 colunas: **Nome** (col-span-2 ou ao lado de **Status/Active**)
- Grid 2 colunas: **E-mail** | **WhatsApp** (com FormDescriptions mantidos)
- Grid 2 colunas: **Servico** | **Data de Inicio**
- Fidelidade (switch) + datas de contrato condicionais
- Observacoes

### 3. Separator + Secao 2 — Configuracoes de Cobranca
Titulo: `"Configurações de Cobrança"`
- Grid **3 colunas**: **Valor Mensal** | **Dia de Vencimento** | **Forma de Faturamento**
- Isso colapsa 3 linhas atuais em 1 unica linha

### 4. Separator + Secao 3 — Dados de Faturamento
Titulo: `"Dados de Faturamento"` (manter subtitulo existente)
- Grid 2 colunas: **CPF/CNPJ** | **CEP**
- Grid 3 colunas: **Rua** (col-span-2) | **Numero**
- Grid 3 colunas: **Complemento** | **Bairro** | **Cidade**
- Grid 2 colunas: **Estado** (sozinho, ja existente)

### 5. Footer
Manter `DialogFooter` fixo com `border-t`, botoes alinhados a direita (ja esta assim).

## Logica
Nenhuma alteracao em logica, estado, validacao ou submit. Apenas JSX/Tailwind.

