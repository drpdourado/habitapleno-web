# 🏢 HabitarPleno — Web

Frontend do sistema de gestão condominial **HabitarPleno**, construído em React + Vite e integrado à API Node.js separada.

> 🔧 **Backend (API):** ver repositório `habitarpleno-api`  
> 📖 **Referência de endpoints:** ver [`habitarpleno-api/API_REFERENCE.md`](../habitarpleno-api/API_REFERENCE.md)

---

## 🏗️ Arquitetura

```
habitarpleno-api/    ← Backend Node.js + Express + Firebase Admin (porta 3000)
habitarpleno-web/    ← Este repositório — Frontend React + Vite (porta 5173)
```

O frontend é uma SPA (Single Page Application) que **não acessa o Firestore diretamente**. Toda comunicação passa pela API REST em `habitarpleno-api`. O `axios` cuida do transporte, e os interceptors injetam automaticamente o token de autenticação e o `x-condo-id` em cada requisição.

---

## 🚀 Stack

| Tecnologia | Versão | Papel |
|------------|--------|-------|
| **React** | 19.x | UI Library |
| **TypeScript** | 5.9 | Tipagem |
| **Vite** | 8.x | Build tool e dev server |
| **TailwindCSS** | 4.x | Estilização utilitária |
| **React Router DOM** | 7.x | Roteamento SPA |
| **Axios** | 1.x | Cliente HTTP para a API |
| **Recharts** | 3.x | Gráficos e visualizações |
| **Lucide React** | 0.577+ | Biblioteca de ícones |
| **jsPDF + AutoTable** | 4.x / 5.x | Geração de PDFs (utilitários locais) |
| **qrcode.react** | 4.x | Renderização de QR Code PIX |
| **react-hot-toast** | 2.x | Notificações toast |
| **clsx + tailwind-merge** | — | Composição de classes CSS |
| **xlsx** | 0.18 | Importação de planilhas Excel |

---

## ⚙️ Configuração

### Pré-requisitos
- Node.js 18+
- npm
- `habitarpleno-api` rodando em `http://localhost:3000`

### Instalação

```bash
git clone <url-do-repositorio>
cd habitarpleno-web
npm install
```

---

## 🏃 Rodando o Projeto

### Pré-condição
A API (`habitarpleno-api`) deve estar rodando antes de iniciar o frontend:
```bash
# No diretório habitarpleno-api:
npm run dev   # Porta 3000
```

### Modo Desenvolvimento
```bash
npm run dev
# → Vite em http://localhost:5173 (ou próxima porta disponível)
```

### Build de Produção
```bash
npm run build     # tsc + vite build → dist/
npm run preview   # Preview local do build
```

---

## 📁 Estrutura de Pastas

```
habitarpleno-web/
├── public/                    # Assets estáticos (favicon, manifest PWA, etc.)
├── src/
│   ├── main.tsx               # Entry point
│   ├── App.tsx                # Roteamento
│   ├── services/              # API Client (Axios)
│   ├── contexts/              # Auth e Global State
│   ├── pages/                 # Módulos do sistema
│   ├── components/            # Componentes React
│   │   └── ui/                # Design System (Habita*)
│   └── utils/                 # Helpers e Business Logic
```

---

## 🔐 Autenticação

O fluxo de auth é gerenciado pelo `AuthContext`:

1. **Login:** `POST /api/auth/login` → recebe `token` + `user`
2. **Persistência:** Token salvo em `localStorage` com chave `@HabitarPleno:token`
3. **Condomínio ativo:** ID salvo em `@HabitarPleno:activeCondoId`
4. **Interceptor Axios:** Injeta automaticamente `Authorization: Bearer <token>` e `x-condo-id` em **todas** as requisições

---

## 🧩 Design System

O projeto possui um Design System próprio com componentes prefixados `Habita*`, todos em `src/components/ui/`.

**Convenção de uso:**
```tsx
import { HabitaButton } from '../components/ui/HabitaButton';
```

---

## 🔄 Padrão de Consumo de Dados

A maioria das páginas sincroniza dados via `/condo/sync`:

```tsx
const { data } = await api.get('/condo/sync');
```

> [!IMPORTANT]
> **Nunca** recalcule o total de uma unidade no frontend. Use sempre `unit.calculatedTotal`.

---

## 👥 Perfis de Acesso

| Role | Acesso |
|------|--------|
| `superadmin` | Gestão global do SaaS |
| `admin` | Gestão completa do condomínio |
| `resident` | Acesso limitado à própria unidade |

---

## 📄 Licença

Projeto privado e proprietário — © HabitarPleno.
