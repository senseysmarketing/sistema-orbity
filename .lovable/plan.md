

# Atualizar CTA da tela de login para Trial

## Alteração

No `src/pages/Auth.tsx`, substituir o bloco "Ainda não utiliza o Orbity? Agende uma demonstração" (que abre o `ApplicationModal`) por um link para `/onboarding?flow=trial` com texto orientado ao trial de 7 dias.

### Antes
```tsx
<button onClick={() => setApplicationOpen(true)} className="...">
  Agende uma demonstração
</button>
```

### Depois
```tsx
<Link to="/onboarding?flow=trial" className="...">
  Teste grátis por 7 dias
</Link>
```

- Texto principal: "Ainda não utiliza o Orbity?" → **"Ainda não utiliza o Orbity?"**
- Link: **"Teste grátis por 7 dias"** apontando para `/onboarding?flow=trial`
- Remover o estado `applicationOpen` e o componente `<ApplicationModal />` (já não serão necessários nesta página)

Ficheiro alterado: `src/pages/Auth.tsx`

