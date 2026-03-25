# 🏢 HabitaPleno — Web

Frontend do sistema de gestão condominial **HabitaPleno**, construído em React + Vite e integrado à API Node.js separada.

> 🔧 **Backend (API):** ver repositório `habitapleno-api`  
> 📖 **Referência de endpoints:** ver [`habitapleno-api/API_REFERENCE.md`](../habitapleno-api/API_REFERENCE.md)

---

## 🏗️ Arquitetura

```
habitapleno-api/    ← Backend Node.js + Express + Firebase Admin (porta 3000)
habitapleno-web/    ← Este repositório — Frontend React + Vite (porta 5173)
```

O frontend é uma SPA (Single Page Application) que **não acessa o Firestore diretamente**. Toda comunicação passa pela API REST em `habitapleno-api`. O `axios` cuida do transporte, e os interceptors injetam automaticamente o token de autenticação e o `x-condo-id` em cada requisição.

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
- `habitapleno-api` rodando em `http://localhost:3000`

### Instalação

```bash
git clone <url-do-repositorio>
cd habitapleno-web
npm install
```

### Variáveis de Ambiente

Não há variáveis de ambiente obrigatórias para o frontend em desenvolvimento. A URL da API está definida diretamente em `src/services/api.ts`:

```typescript
// src/services/api.ts
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});
```

Para apontar para outro ambiente, altere a `baseURL` (ou crie lógica de `import.meta.env`).

---

## 🏃 Rodando o Projeto

### Pré-condição
A API (`habitapleno-api`) deve estar rodando antes de iniciar o frontend:
```bash
# No diretório habitapleno-api:
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

### Lint
```bash
npm run lint
```

---

## 📁 Estrutura de Pastas

```
habitapleno-web/
├── public/                    # Assets estáticos (favicon, manifest PWA, etc.)
├── src/
│   ├── main.tsx               # Entry point — monta React + AuthProvider + Router
│   ├── App.tsx                # Definição de rotas com React Router DOM
│   ├── index.css              # CSS global (variáveis, reset, animações)
│   ├── firebase.ts            # Config Firebase Client (Auth apenas, sem Firestore direto)
│   │
│   ├── services/
│   │   ├── api.ts             # ⭐ Instância Axios c/ interceptors (token + x-condo-id)
│   │   ├── CondoService.ts    # Helpers para dados do condomínio
│   │   ├── NotificationService.ts
│   │   ├── AdminService.ts
│   │   ├── PlanService.ts
│   │   └── SystemService.ts
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx    # ⭐ Auth: signIn, signOut, user, isAdmin, isOperator
│   │   ├── AppContext.tsx     # Estado global da aplicação (condo data, sync)
│   │   ├── NotificationContext.tsx
│   │   └── ToastContext.ts
│   │
│   ├── pages/                 # Uma página por módulo funcional
│   │   ├── DashboardPage.tsx       # Dashboard principal (consome /condo/sync)
│   │   ├── FinancialPage.tsx       # Gestão financeira
│   │   ├── HistoryPage.tsx         # Histórico mensal
│   │   ├── HistoryDetailsPage.tsx  # Detalhes de um mês
│   │   ├── UnitsPage.tsx           # Gestão de unidades
│   │   ├── SettingsPage.tsx        # Configurações do condomínio
│   │   ├── ReportsPage.tsx         # Relatórios e gráficos
│   │   ├── MuralPage.tsx           # Mural de avisos
│   │   ├── OcorrenciasPage.tsx     # Chamados e ocorrências
│   │   ├── BookingPage.tsx         # Reservas de áreas comuns
│   │   ├── AreasAdminPage.tsx      # Gestão de áreas (admin)
│   │   ├── AccessControlPage.tsx   # Portaria e controle de acesso
│   │   ├── ManutencoesPage.tsx     # Manutenções preventivas
│   │   ├── MonthClosurePage.tsx    # Fechamento mensal
│   │   ├── ReconciliationPage.tsx  # Conciliação financeira (OFX)
│   │   ├── ReadingsManagerPage.tsx # Gerenciador de leituras de gás
│   │   ├── MobileReading.tsx       # Interface de leitura mobile
│   │   ├── ContactPage.tsx         # Fale conosco (chamados do morador)
│   │   ├── ConciergePage.tsx       # Portaria (encomendas)
│   │   ├── NotificationsPage.tsx   # Central de notificações
│   │   ├── ProfilePage.tsx         # Perfil do usuário
│   │   ├── UsersPage.tsx           # Gestão de usuários
│   │   ├── ProfilesPage.tsx        # Perfis de acesso RBAC
│   │   ├── CondosPage.tsx          # Gestão de condomínios (Superadmin)
│   │   ├── CondoPlansPage.tsx      # Planos SaaS (Superadmin)
│   │   ├── Polls/                  # Enquetes e assembleias virtuais
│   │   ├── BankAccountsPage.tsx    # Contas bancárias
│   │   ├── CategoriesPage.tsx      # Categorias financeiras
│   │   ├── DocumentsPage.tsx       # Documentos do condomínio
│   │   ├── ImprovementsPage.tsx    # Sugestões e melhorias
│   │   ├── LoginPage.tsx           # Tela de login
│   │   ├── RegisterPage.tsx        # Cadastro (admin flow)
│   │   └── DesignSystemPage.tsx    # Documentação visual do Design System
│   │
│   ├── components/
│   │   ├── Navbar.tsx              # Barra de navegação lateral/superior
│   │   ├── Layout.tsx              # Wrapper de layout global
│   │   ├── PrivateRoute.tsx        # Guard de rota autenticada
│   │   ├── ModuleRoute.tsx         # Guard de rota por permissão de módulo
│   │   ├── CondoSelector.tsx       # Seletor de condomínio (multi-condo)
│   │   ├── QuickSearchModal.tsx    # Busca rápida global
│   │   ├── NotificationBell.tsx    # Sino de notificações
│   │   ├── ImportUnitsModal.tsx    # Import de unidades via Excel
│   │   └── ui/                     # Design System (componentes Habita*)
│   │       ├── HabitaButton.tsx
│   │       ├── HabitaCard.tsx
│   │       ├── HabitaModal.tsx
│   │       ├── HabitaTable.tsx
│   │       ├── HabitaForm.tsx      # HabitaInput, HabitaSelect, etc.
│   │       ├── HabitaCombobox.tsx
│   │       ├── HabitaStatCard.tsx
│   │       ├── HabitaStatGrid.tsx
│   │       ├── HabitaBadge.tsx
│   │       ├── HabitaSpinner.tsx
│   │       ├── HabitaNavigation.tsx
│   │       └── ... (28 componentes no total)
│   │
│   └── utils/
│       ├── rbac.ts                 # Utilitário de permissões (hasPermission)
│       ├── ReceiptGenerator.ts     # Chama POST /financial/generate-pdf → Blob download
│       ├── PixUtils.ts             # Geração de payload PIX (chave → string)
│       ├── PDFReportUtils.ts       # Wrappers de chamadas de relatório PDF
│       ├── OfxUtils.ts             # Parsing de OFX para reconciliação
│       └── FirebaseUtils.ts        # Utils Firebase Client (auth helpers)
│
├── index.html                 # HTML base (título, meta tags, manifest PWA)
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.app.json
└── package.json
```

---

## 🔐 Autenticação

O fluxo de auth é gerenciado pelo `AuthContext`:

1. **Login:** `POST /api/auth/login` → recebe `token` + `user`
2. **Persistência:** Token salvo em `localStorage` com chave `@HabitaPleno:token`
3. **Condomínio ativo:** ID salvo em `@HabitaPleno:activeCondoId`
4. **Interceptor Axios:** Injeta automaticamente `Authorization: Bearer <token>` e `x-condo-id` em **todas** as requisições
5. **Re-sincronização:** Na inicialização do app, chama `GET /api/auth/me` para validar e atualizar o perfil

```typescript
// Níveis de acesso disponíveis no AuthContext
const { isAdmin, isOperator, isSuperAdmin, accessProfile } = useAuth();
```

---

## 🧩 Design System

O projeto possui um Design System próprio com componentes prefixados `Habita*`, todos em `src/components/ui/`. A documentação visual interativa está disponível na rota `/design-system` (apenas em desenvolvimento).

**Convenção de uso:**
```tsx
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaStatCard } from '../components/ui/HabitaStatCard';
```

---

## 🔄 Padrão de Consumo de Dados

A maioria das páginas segue este padrão:

```tsx
// 1. Busca dados via API (geralmente via /condo/sync no DashboardPage)
const { data } = await api.get('/condo/sync');

// 2. Dados derivados via useMemo
const pendingUnits = useMemo(() => units.filter(u => !u.paymentDate), [units]);

// 3. Mutações sempre invalidam e re-buscam o dado
await api.put(`/units/${id}`, payload);
await fetchDashboardData(); // re-sincroniza
```

> [!IMPORTANT]
> **Nunca** recalcule o total de uma unidade no frontend. Use sempre `unit.calculatedTotal` (calculado pela API no `/condo/sync`) ou `unit.amountPaid`.

---

## 👥 Perfis de Acesso

| Role | Acesso |
|------|--------|
| `superadmin` | Todos os módulos + gestão de condomínios e planos |
| `admin` | Gestão completa do seu condomínio |
| `sindico` / `operator` / `zelador` | Módulos operacionais (leituras, portaria, reservas) |
| `resident` | Dados da própria unidade, mural, chamados, reservas |

Permissões granulares por módulo são controladas via `accessProfile.permissions` e verificadas com `hasPermission(accessProfile, 'modulo', 'nivel')` (`src/utils/rbac.ts`).

---

## 📄 Licença

Projeto privado e proprietário — © HabitaPleno.
