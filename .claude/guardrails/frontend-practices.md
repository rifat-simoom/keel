# guardrails/frontend-practices.md — React + Vite + Tailwind Best Practices

> Rules are **ABSOLUTE**. Any generated code that violates them makes the session invalid.
> Stack context: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, TanStack Query,
> React Hook Form + Zod, React Router v6. Shared via @keel/types, @keel/api, @keel/validation.

---

## React Practices

### R-1: Never use `any` — use types from @keel/types

```typescript
// ❌ FORBIDDEN
const invoice: any = await api.get("/invoices/123")
function formatAmount(amount: any): string { ... }

// ✅ REQUIRED
import type { Invoice } from "@keel/types"
const invoice: Invoice = await api.get("/invoices/123")
```

### R-2: Never call fetch/axios directly — always use @keel/api

```typescript
// ❌ FORBIDDEN — bypasses auth interceptors, error handling, base URL
const res = await fetch("/api/v1/invoices")
const res = await axios.get("/api/v1/invoices")

// ✅ REQUIRED — interceptors handle token refresh and error normalisation
import { api } from "@keel/api"
const invoices = await api.get<Invoice[]>("/invoices")
```

### R-3: Never use useEffect for data fetching — use TanStack Query

```typescript
// ❌ FORBIDDEN
useEffect(() => {
  fetch("/api/v1/invoices").then(r => r.json()).then(setInvoices)
}, [])

// ✅ REQUIRED
const { data: invoices, isLoading } = useQuery({
  queryKey: ["invoices"],
  queryFn: () => api.get<Invoice[]>("/invoices"),
})
```

### R-4: Invalidate query cache after mutations — never manually update state

```typescript
// ❌ FORBIDDEN — cache gets stale, UI shows wrong data
const createInvoice = async (data) => {
  await api.post("/invoices", data)
  setInvoices(prev => [...prev, data])
}

// ✅ REQUIRED
const queryClient = useQueryClient()
const mutation = useMutation({
  mutationFn: (data: InvoiceCreate) => api.post<Invoice>("/invoices", data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
})
```

### R-5: Never use dangerouslySetInnerHTML with user content

```tsx
// ❌ FORBIDDEN — XSS vector
<div dangerouslySetInnerHTML={{ __html: invoice.notes }} />

// ✅ REQUIRED — render as text, or use a sanitiser if HTML is required
<p>{invoice.notes}</p>
// If HTML is genuinely needed: use DOMPurify first
import DOMPurify from "dompurify"
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(invoice.notes) }} />
```

### R-6: All forms use React Hook Form + Zod schema from @keel/validation

```typescript
// ❌ FORBIDDEN — manual state, no validation schema
const [amount, setAmount] = useState("")
const handleSubmit = () => {
  if (!amount) return
  api.post("/invoices", { amount: parseFloat(amount) })
}

// ✅ REQUIRED
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { invoiceCreateSchema } from "@keel/validation"

const form = useForm({ resolver: zodResolver(invoiceCreateSchema) })
```

### R-7: Never store access tokens in component state or localStorage

```typescript
// ❌ FORBIDDEN
const [token, setToken] = useState("")
localStorage.setItem("token", accessToken)

// ✅ REQUIRED — Zustand auth store, in-memory only
import { useAuthStore } from "@/stores/auth"
const accessToken = useAuthStore(state => state.accessToken)
```

### R-8: Co-locate component files — one folder per feature

```
// ❌ FORBIDDEN — flat dump in components/
components/
  InvoiceList.tsx
  InvoiceListItem.tsx
  InvoiceListEmpty.tsx
  InvoiceForm.tsx

// ✅ REQUIRED — co-located by feature
features/invoices/
  InvoiceList/
    index.tsx          ← public export
    InvoiceListItem.tsx
    InvoiceListEmpty.tsx
  InvoiceForm/
    index.tsx
```

### R-9: Never use index as key for list items that can reorder

```tsx
// ❌ FORBIDDEN
{invoices.map((inv, i) => <InvoiceRow key={i} invoice={inv} />)}

// ✅ REQUIRED
{invoices.map(inv => <InvoiceRow key={inv.id} invoice={inv} />)}
```

### R-10: Always handle loading and error states from queries

```tsx
// ❌ FORBIDDEN — renders undefined, causes runtime error
const { data } = useQuery({ queryKey: ["invoices"], queryFn: fetchInvoices })
return <InvoiceList invoices={data} />

// ✅ REQUIRED
const { data, isLoading, isError } = useQuery({ ... })
if (isLoading) return <Skeleton />
if (isError) return <ErrorState />
return <InvoiceList invoices={data} />
```

### R-11: Use currency integers (pence) in math — display only for humans

```typescript
// ❌ FORBIDDEN — float arithmetic loses pence
const total = invoice.subtotal * 1.2  // float multiplication

// ✅ REQUIRED — pence arithmetic only, format for display
import { formatPence, addVat } from "@keel/utils"
const totalPence = addVat(invoice.subtotalPence)  // integer math
const display = formatPence(totalPence)            // "£1,200.00"
```

---

## Vite Practices

### V-1: Never import from deep node_modules paths — use package exports

```typescript
// ❌ FORBIDDEN
import { something } from "some-lib/dist/internal/thing"

// ✅ REQUIRED
import { something } from "some-lib"
```

### V-2: Lazy-load heavy routes — never import page components at the top level

```typescript
// ❌ FORBIDDEN — entire app bundle loaded upfront
import InvoicePDFPreview from "@/pages/InvoicePDFPreview"

// ✅ REQUIRED
const InvoicePDFPreview = lazy(() => import("@/pages/InvoicePDFPreview"))
```

### V-3: Env vars must be prefixed VITE_ and never contain secrets

```typescript
// ❌ FORBIDDEN — exposes secret to browser
VITE_SECRET_KEY=abc123

// ✅ REQUIRED — only public config in VITE_ vars
VITE_API_BASE_URL=https://api.keelapp.co.uk
VITE_KEYCLOAK_URL=https://auth.keelapp.co.uk
```

---

## Tailwind Practices

### T-1: Never use arbitrary values when a design token exists

```tsx
// ❌ FORBIDDEN — breaks design system consistency
<div className="text-[13px] mt-[18px] text-[#6b7280]" />

// ✅ REQUIRED — use scale tokens
<div className="text-sm mt-4 text-gray-500" />
```

### T-2: Never mix inline styles with Tailwind classes

```tsx
// ❌ FORBIDDEN
<div className="flex items-center" style={{ gap: "12px" }} />

// ✅ REQUIRED
<div className="flex items-center gap-3" />
```

### T-3: Extract repeated class combinations into a component — not a @apply

```tsx
// ❌ FORBIDDEN — @apply creates invisible coupling and bloats CSS
// In a .css file:
.card { @apply rounded-lg border bg-white p-4 shadow-sm; }

// ❌ ALSO FORBIDDEN — duplicated className strings across files
<div className="rounded-lg border bg-white p-4 shadow-sm">...</div>  // copy-pasted 6 times

// ✅ REQUIRED — extract to a reusable component
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border bg-white p-4 shadow-sm">{children}</div>
)
```

### T-4: Use shadcn/ui primitives before writing custom components

```tsx
// ❌ FORBIDDEN — reimplementing what shadcn already provides
const MyButton = ({ children, onClick }) => (
  <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" onClick={onClick}>
    {children}
  </button>
)

// ✅ REQUIRED
import { Button } from "@/components/ui/button"
<Button onClick={onClick}>{children}</Button>
```

### T-5: Responsive classes must be mobile-first

```tsx
// ❌ FORBIDDEN — desktop-first, breaks on mobile
<div className="grid grid-cols-3 sm:grid-cols-1" />

// ✅ REQUIRED — mobile base, scale up
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
```

### T-6: Never hardcode colours outside the theme — extend tailwind.config.ts

```tsx
// ❌ FORBIDDEN
<div className="bg-[#1a56db]" />
<div style={{ color: "#1a56db" }} />

// ✅ REQUIRED — extend theme first, then use semantic token
// tailwind.config.ts: colors: { brand: { DEFAULT: "#1a56db" } }
<div className="bg-brand" />
```

---

## TypeScript Practices

### TS-1: All new domain entities defined in @keel/types — never locally

```typescript
// ❌ FORBIDDEN — type only lives in web/ or mobile/
interface Invoice { id: string; ... }

// ✅ REQUIRED — in packages/types/src/, exported from index.ts
// Then imported:
import type { Invoice } from "@keel/types"
```

### TS-2: Never use non-null assertion on API data

```typescript
// ❌ FORBIDDEN — crashes at runtime if undefined
const name = invoice.client!.name

// ✅ REQUIRED — guard explicitly
const name = invoice.client?.name ?? "Unknown client"
```

### TS-3: Zod schemas live in @keel/validation — never duplicate in web or mobile

```typescript
// ❌ FORBIDDEN — duplicate schema
// In web/src/schemas/invoice.ts:
const invoiceSchema = z.object({ amount: z.string() })

// ✅ REQUIRED
import { invoiceCreateSchema } from "@keel/validation"
```
