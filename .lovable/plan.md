

# Reestruturação do Modal de Detalhes do Lead + Perguntas Meta Ads

## Problema Atual

O modal de detalhes do lead tem **4 abas redundantes**:
1. **Visão Geral** - Contém contato, valor, tempo no funil, datas, dados do Meta
2. **Detalhes** - Repete status, temperatura, origem (já visíveis no header e Visão Geral)
3. **Notas** - Apenas mostra um campo de texto
4. **Histórico** - Lista de movimentações

Além disso, para leads do Meta Ads, as **perguntas e respostas do formulário** estão armazenadas em `custom_fields` mas **não são exibidas** ao usuário.

---

## Solução Proposta

Remover o sistema de abas e criar uma **única página scrollável** com seções organizadas usando **Accordions** para conteúdo secundário, mantendo tudo visível e acessível.

### Novo Layout (Página Única)

```text
+---------------------------------------------+
| Header: Nome + Status Badge + Temperatura   |
| Empresa • Cargo • Origem                    |
+---------------------------------------------+
|                                             |
| [Cards lado a lado]                         |
| +-------------------+  +------------------+ |
| | Valor do Lead    |  | Tempo no Funil  | |
| | R$ 0,00          |  | 0 dias          | |
| +-------------------+  +------------------+ |
|                                             |
| [Card] Informações de Contato               |
| Email: xxx@xxx.com                          |
| Telefone: +55 xx xxxxx-xxxx                 |
| Empresa: XXX                                |
|                                             |
| [Card - NOVO] Respostas do Formulário Meta  |  ← NOVO
| (só aparece para leads source=facebook_leads)|
| +-----------------------------------------+ |
| | Qual seu VGV mensal?                    | |
| | menos_de_r$500.000                      | |
| +-----------------------------------------+ |
| | Você tem verba para marketing?          | |
| | sim                                     | |
| +-----------------------------------------+ |
| ... (todas as perguntas do formulário)      |
|                                             |
| [Card] Datas e Follow-ups                   |
| Criado em: ...                              |
| Último contato: ...                         |
| Próximo contato: ...                        |
|                                             |
| [Card] Tags (se houver)                     |
| #tag1 #tag2 ...                             |
|                                             |
| [Accordion] Notas                           |
| > Clique para expandir                      |
|   (conteúdo das notas)                      |
|                                             |
| [Accordion] Histórico de Movimentações      |
| > Clique para expandir                      |
|   - Lead movido de X para Y                 |
|   - ...                                     |
|                                             |
+---------------------------------------------+
| [Fechar]              [Editar Lead]         |
+---------------------------------------------+
```

---

## Detalhes Técnicos

### 1. Nova Seção: Respostas do Formulário Meta

Criar função para extrair e formatar perguntas/respostas do `custom_fields`:

```typescript
// Campos padrão do Facebook que não são perguntas do formulário
const STANDARD_FIELDS = ['full_name', 'email', 'phone_number', 'company_name', 'form_name', 'page_name'];

// Extrair apenas as perguntas personalizadas
const getFormQuestions = (customFields: any) => {
  if (!customFields) return [];
  
  return Object.entries(customFields)
    .filter(([key]) => !STANDARD_FIELDS.includes(key))
    .map(([question, answer]) => ({
      question: formatQuestion(question),
      answer: formatAnswer(answer as string)
    }));
};

// Formatar pergunta: "qual_o_seu_vgv_mensal?" → "Qual o seu VGV mensal?"
const formatQuestion = (key: string) => {
  return key
    .replace(/_/g, ' ')
    .replace(/\?$/, '')
    .replace(/^\w/, c => c.toUpperCase()) + '?';
};

// Formatar resposta: "menos_de_r$500.000" → "Menos de R$ 500.000"
const formatAnswer = (value: string) => {
  return value
    .replace(/_/g, ' ')
    .replace(/r\$/gi, 'R$ ')
    .replace(/^\w/, c => c.toUpperCase());
};
```

### 2. Componente de Perguntas do Formulário

```tsx
{isMetaAdsLead && formQuestions.length > 0 && (
  <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-blue-600" />
        Respostas do Formulário
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {formQuestions.map((item, index) => (
        <div key={index} className="border-b last:border-0 pb-3 last:pb-0">
          <p className="text-sm text-muted-foreground">{item.question}</p>
          <p className="text-sm font-medium mt-1">{item.answer}</p>
        </div>
      ))}
    </CardContent>
  </Card>
)}
```

### 3. Accordions para Notas e Histórico

Substituir as abas por accordions colapsáveis:

```tsx
<Accordion type="multiple" className="space-y-2">
  {/* Notas */}
  <AccordionItem value="notes" className="border rounded-lg">
    <AccordionTrigger className="px-4">
      <span className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Notas do Lead
      </span>
    </AccordionTrigger>
    <AccordionContent className="px-4">
      {lead.notes || <span className="text-muted-foreground italic">Nenhuma nota adicionada</span>}
    </AccordionContent>
  </AccordionItem>

  {/* Histórico */}
  <AccordionItem value="history" className="border rounded-lg">
    <AccordionTrigger className="px-4">
      <span className="flex items-center gap-2">
        <History className="h-4 w-4" />
        Histórico de Movimentações
        {history.length > 0 && (
          <Badge variant="secondary" className="ml-2">{history.length}</Badge>
        )}
      </span>
    </AccordionTrigger>
    <AccordionContent className="px-4">
      {/* Lista de histórico */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/crm/LeadDetailsDialog.tsx` | Reestruturar completamente: remover abas, adicionar página única com cards + accordions + seção de respostas do formulário |

---

## Benefícios

| Antes | Depois |
|-------|--------|
| 4 abas com conteúdo redundante | Página única organizada |
| Precisa clicar em cada aba | Scroll natural, tudo visível |
| Perguntas do Meta Ads não exibidas | Perguntas e respostas formatadas e visíveis |
| Notas em aba separada | Accordion colapsável inline |
| Histórico em aba separada | Accordion colapsável com badge de contagem |

---

## Preview Visual Esperado

Para leads do Meta Ads como "Alexandre Taveira", o modal mostrará:

1. **Header** com nome, badges de status/temperatura
2. **Cards de métricas** (valor e tempo no funil)
3. **Card de contato** (email, telefone, empresa)
4. **Card de Respostas do Formulário** (NOVO):
   - Em qual opção você melhor se encaixa? → Corretor autônomo
   - Qual o seu VGV mensal? → Menos de R$ 500.000
   - Você tem verba disponível para o marketing? → Não
   - O custo do nosso trabalho é de R$ 1.490 reais, faz sentido pra você? → Não, sem chance.
5. **Card de datas** (criado, último contato, próximo contato)
6. **Tags** (se houver)
7. **Accordion de Notas** (colapsável)
8. **Accordion de Histórico** (colapsável com badge)

