# Keel

**All-in-one business finance for UK freelancers and small companies.**

Keel replaces the spreadsheet, the invoicing website, the shoebox of receipts, and the once-a-year accountant meeting — with a single dashboard that keeps your finances current in real time.

![Dashboard](docs/dashboard.png)

---

## What it does

| Feature | Description |
|---------|-------------|
| **Banking** | UK business account with real-time balance, HMRC-categorised transactions, virtual card, and Open Banking import via TrueLayer |
| **Invoicing** | Create, send, and track invoices — draft → sent → viewed → paid lifecycle with PDF generation |
| **Receipts & Documents** | Upload receipts (JPEG, PNG, PDF, HEIC), extract details, and link to transactions as HMRC evidence |
| **Tax** | Live Corporation Tax estimate, VAT return prep, and salary vs dividends optimiser |
| **Deadlines** | Upcoming HMRC deadlines surfaced to the dashboard so nothing gets missed |

---

## Screenshots

### Transactions & Banking
![Transactions](docs/transaction.png)

### Invoices
![Invoices](docs/invoice.png)

### Receipts & Documents
![Documents](docs/document.png)

### Tax
![Tax](docs/tax.png)

---

## Tech stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS
- TanStack Query
- Keycloak (authentication)

**Backend — microservices (FastAPI + Python 3.12)**

| Service | Port | Responsibility |
|---------|------|----------------|
| Gateway | 8000 | Reverse proxy — routes all `/api/v1/*` requests |
| Auth | 8001 | User profiles, company settings, Keycloak integration |
| Banking | 8002 | Accounts, transactions, virtual cards, TrueLayer Open Banking |
| Invoice | 8003 | Invoice lifecycle, PDF generation, email delivery |
| Documents | 8004 | Receipt storage (MinIO/S3), transaction matching |
| Tax | 8005 | CT estimates, VAT returns, salary optimiser |
| Notifications | 8006 | In-app notifications, HMRC deadline tracking |

**Infrastructure**
- PostgreSQL 16
- Keycloak 24 (OIDC)
- RabbitMQ (outbox events)
- Redis (caching)
- MinIO (document storage)

---

## Running locally

### Prerequisites

- Docker + Docker Compose
- TrueLayer sandbox credentials (free at [console.truelayer.com](https://console.truelayer.com))

### 1. Clone and configure

```bash
git clone git@github.com:rifat-simoom/keel.git
cd keel
```

Create a `.env` file in the project root (never committed):

```env
TRUELAYER_CLIENT_ID=your-sandbox-client-id
TRUELAYER_CLIENT_SECRET=your-sandbox-client-secret
TRUELAYER_REDIRECT_URI=http://localhost:5173/banking/callback
TRUELAYER_SANDBOX=true
```

### 2. Start everything

```bash
docker compose up --build
```

This starts all services, runs database migrations, and seeds initial data.

| URL | Service |
|-----|---------|
| http://localhost:3000 | Web app |
| http://localhost:8280 | Keycloak admin console |
| http://localhost:9101 | MinIO console |

### 3. Log in

Default credentials (Keycloak dev realm):

- **Email:** `user@keel.dev`
- **Password:** `password`

### Connect a bank (Open Banking sandbox)

1. Go to **Transactions** and click **Connect bank**
2. You will be redirected to TrueLayer's sandbox
3. Select **Mock Bank** and log in with `john` / `doe`
4. Up to 90 days of transactions are imported automatically

---

## Project structure

```
keel/
├── backend/
│   ├── gateway/          # API gateway (FastAPI reverse proxy)
│   ├── services/
│   │   ├── auth/         # Auth service + Alembic migrations
│   │   ├── banking/      # Banking + TrueLayer integration
│   │   ├── invoice/      # Invoice service
│   │   ├── documents/    # Document storage service
│   │   ├── tax/          # Tax calculations service
│   │   └── notifications/# Notifications + deadlines service
│   └── shared/           # Shared models, auth middleware, config
├── web/                  # React frontend
│   └── src/
│       ├── pages/        # Page components
│       ├── hooks/        # React Query hooks
│       └── components/   # Shared UI components
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── api/              # Axios client
│   ├── validation/       # Zod schemas
│   └── utils/            # Shared utilities
├── infrastructure/
│   └── keycloak/         # Realm import config
└── docs/                 # Screenshots and user guide
```

---

## Roadmap

- [ ] Real bank account via Banking-as-a-Service provider
- [ ] Stripe Issuing virtual card (replace simulated card)
- [ ] AI receipt extraction (OCR → auto-fill fields)
- [ ] Payroll — PAYE calculations and payslip generation
- [ ] Mobile app (iOS + Android)
- [ ] HMRC Making Tax Digital API integration

---

## Licence

Private — all rights reserved.
