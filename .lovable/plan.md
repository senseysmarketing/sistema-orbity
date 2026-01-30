

# Ajuste: Navegação para Configurações via Central de Notificações

## Problema

Ao clicar no ícone de engrenagem (⚙️) na Central de Notificações do header, ainda abre o modal antigo ao invés de navegar para a página dedicada `/dashboard/settings/notifications`.

## Solução

Modificar o `NotificationCenter` para usar `useNavigate` e fechar o popover/drawer antes de navegar para a página.

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/notifications/NotificationCenter.tsx` | Substituir abertura de modal por navegação |

---

## Mudanças Detalhadas

### 1. Adicionar import do `useNavigate`

```typescript
import { useNavigate } from "react-router-dom";
```

### 2. Remover estado e import do modal

**Remover:**
```typescript
import { NotificationPreferences } from "./NotificationPreferences";
// ...
const [preferencesOpen, setPreferencesOpen] = useState(false);
```

### 3. Adicionar hook de navegação

```typescript
const navigate = useNavigate();
```

### 4. Modificar botão de configurações

**Antes:**
```typescript
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 md:h-9 md:w-9"
  onClick={() => setPreferencesOpen(true)}
>
  <Settings className="h-4 w-4" />
</Button>
```

**Depois:**
```typescript
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 md:h-9 md:w-9"
  onClick={() => {
    onClose(); // Fecha o popover/drawer primeiro
    navigate('/dashboard/settings/notifications');
  }}
>
  <Settings className="h-4 w-4" />
</Button>
```

### 5. Remover componente modal do JSX

**Remover:**
```typescript
<NotificationPreferences 
  open={preferencesOpen}
  onOpenChange={setPreferencesOpen}
/>
```

---

## Fluxo Após Implementação

```text
Header → Ícone de Sino 🔔 → Abre Central de Notificações
                                    ↓
                    Clica no ícone de Engrenagem ⚙️
                                    ↓
                    Fecha popover/drawer automaticamente
                                    ↓
                    Navega para /dashboard/settings/notifications
```

---

## Benefício

Agora tanto o caminho por **Configurações → Notificações** quanto pelo **Sino → Engrenagem** levam para a mesma página dedicada, evitando o problema de refresh loop no mobile.

