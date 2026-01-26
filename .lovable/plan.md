
# Plano: Configurar Credenciais Firebase

## Valores a Configurar

Com base nas credenciais fornecidas:

| Variável | Valor |
|----------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyBIDL3R7nd0pE0wzmXdNePWTSyxOvyZ0cY` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `orbityapp-f710e.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `orbityapp-f710e` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `orbityapp-f710e.appspot.com` |
| `VITE_FIREBASE_SENDER_ID` | `929526059094` |
| `VITE_FIREBASE_APP_ID` | `1:929526059094:web:61fb87a4f693ddd61b2bf7` |
| `VITE_FIREBASE_VAPID_KEY` | `BM3GV__9-88MocDQZ0uL8kB-C6YU6sLpyFn2GlHukLHS-Iaf9EVOcOgZzCq6pwTAlHV0dZONiYL-WtYkz2Zd4b4` |

---

## Alterações Técnicas

### 1. Arquivo `.env`

Atualizar as variáveis Firebase com os valores reais:

```env
VITE_FIREBASE_API_KEY="AIzaSyBIDL3R7nd0pE0wzmXdNePWTSyxOvyZ0cY"
VITE_FIREBASE_AUTH_DOMAIN="orbityapp-f710e.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="orbityapp-f710e"
VITE_FIREBASE_STORAGE_BUCKET="orbityapp-f710e.appspot.com"
VITE_FIREBASE_SENDER_ID="929526059094"
VITE_FIREBASE_APP_ID="1:929526059094:web:61fb87a4f693ddd61b2bf7"
VITE_FIREBASE_VAPID_KEY="BM3GV__9-88MocDQZ0uL8kB-C6YU6sLpyFn2GlHukLHS-Iaf9EVOcOgZzCq6pwTAlHV0dZONiYL-WtYkz2Zd4b4"
```

### 2. Arquivo `public/firebase-messaging-sw.js`

Atualizar a configuração padrão com os valores reais (para garantir que o Service Worker funcione mesmo sem o postMessage):

```javascript
const defaultConfig = {
  apiKey: "AIzaSyBIDL3R7nd0pE0wzmXdNePWTSyxOvyZ0cY",
  authDomain: "orbityapp-f710e.firebaseapp.com",
  projectId: "orbityapp-f710e",
  storageBucket: "orbityapp-f710e.appspot.com",
  messagingSenderId: "929526059094",
  appId: "1:929526059094:web:61fb87a4f693ddd61b2bf7"
};
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `.env` | Preencher variáveis Firebase |
| `public/firebase-messaging-sw.js` | Atualizar defaultConfig com valores reais |

---

## Resultado Esperado

Após essas configurações:
- O hook `usePushNotifications` funcionará corretamente
- O Service Worker será inicializado automaticamente
- Usuários poderão ativar notificações push nas Configurações > Notificações
