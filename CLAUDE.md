# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**碎石记（Crusher）** is a Next.js-based AI-powered document analysis platform that uses multiple "lenses" to analyze text documents. Users can create documents, apply different analysis lenses (requirements, meeting notes, reviews, risk assessment, etc.), and get AI-powered insights.

**Tech Stack:**
- [Next.js 15.2.4](https://nextjs.org/) - React framework with App Router
- [React 19.1.0](https://react.dev/) - UI library
- [TypeScript 5](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS 3.4.19](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible UI components
- [Supabase](https://supabase.com/) - Backend-as-a-Service (auth, database)
- [Zustand 5.0.3](https://zustand-demo.pmnd.rs/) - Lightweight state management
- [DeepSeek API](https://www.deepseek.com/) - AI/LLM provider
- [Framer Motion 11.18.0](https://www.framer.com/motion/) - Animation library
- [Sonner 1.7.4](https://sonner.emilkowal.ski/) - Toast notifications
- [react-hook-form 7.71.2](https://react-hook-form.com/) - Form validation
- [Zod 3.25.76](https://zod.dev/) - Schema validation

**Key Features:**
- Multi-platform responsive design (PC sidebar + mobile bottom nav)
- User authentication with Supabase Auth
- Document capture (text/voice)
- AI-powered analysis using multiple lenses
- Credit-based payment system (Hupijiao payment provider)
- Admin dashboard
- Custom lens creation

## Build and Run Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

**Main Application:** [src/app/layout.tsx](src/app/layout.tsx)
- Default port: 3000
- Path alias: `@/*` maps to `./src/*`

## Project Structure

```
crusher/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── (auth)/             # Authentication routes (login, register)
│   │   ├── (main)/             # Main application routes (require auth)
│   │   │   ├── capture/        # Document creation
│   │   │   ├── documents/       # Document list and details
│   │   │   ├── lenses/         # Lens management
│   │   │   ├── profile/        # User profile and payment
│   │   │   └── page.tsx       # Home page
│   │   ├── admin/              # Admin dashboard
│   │   ├── api/                # API routes
│   │   ├── globals.css         # Global styles
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── layout/             # Layout components
│   │   │   ├── sidebar.tsx     # PC sidebar navigation
│   │   │   ├── bottom-nav.tsx  # Mobile bottom navigation
│   │   │   └── top-bar.tsx     # Top header bar
│   │   └── ui/                # Reusable UI components (Radix UI based)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── ...            # More UI components
│   ├── lib/
│   │   ├── supabase/          # Supabase client configuration
│   │   │   ├── client.ts       # Client-side Supabase client
│   │   │   ├── server.ts       # Server-side Supabase client + helpers
│   │   │   └── README.md      # Detailed Supabase usage guide
│   │   ├── prompts/           # AI prompts directory
│   │   └── utils.ts          # Utility functions (cn, etc.)
│   ├── store/
│   │   ├── auth.ts           # Zustand auth store
│   │   └── index.ts         # Store exports
│   ├── types/
│   │   ├── index.ts          # Application type definitions
│   │   └── supabase.ts      # Database type definitions
│   └── middleware.ts        # Next.js middleware (auth, routing)
├── public/                   # Static assets
├── next.config.ts           # Next.js configuration (PWA, security headers)
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Architecture Patterns

### Responsive Layout System

The application uses a **dual-layout pattern** with conditional rendering based on device size:

**PC Layout (>md breakpoint):**
- Fixed sidebar (60px width on left)
- Top bar header
- Main content area

**Mobile Layout (<md breakpoint):**
- Top bar header
- Main content area
- Fixed bottom navigation bar

See [src/app/(main)/layout.tsx](src/app/(main)/layout.tsx#L44) for implementation.

### Authentication Flow

1. **Middleware Layer** ([src/middleware.ts](src/middleware.ts)):
   - Validates JWT tokens using Supabase
   - Redirects unauthenticated users to `/login`
   - Protects admin routes (`/admin`) with role verification
   - Whitelists public routes (`/login`, `/register`)
   - Bypasses webhook routes for payment callbacks

2. **Server Components**: Use [src/lib/supabase/server.ts](src/lib/supabase/server.ts):
   ```typescript
   import { getCurrentUser, getCurrentProfile, createServerClient } from '@/lib/supabase/server'

   const user = await getCurrentUser()
   const profile = await getCurrentProfile()
   ```

3. **Client Components**: Use [src/lib/supabase/client.ts](src/lib/supabase/client.ts):
   ```typescript
   import { createClient } from '@/lib/supabase/client'

   const supabase = createClient()
   ```

### State Management

**Zustand** is used for lightweight client-side state:

**Auth Store** ([src/store/auth.ts](src/store/auth.ts)):
- Stores user profile data
- Manages credit balance
- Provides `setProfile()` and `updateCredits()` actions

### Component Architecture

**UI Components** follow **Radix UI + Tailwind CSS pattern**:
- Uses [class-variance-authority](https://cva.style/) for variant-based styling
- Implements proper TypeScript types
- Follows composition pattern with `Slot` for polymorphic behavior

Example from [src/components/ui/button.tsx](src/components/ui/button.tsx#L7):
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: { default, destructive, outline, secondary, ghost, link },
      size: { default, sm, lg, icon }
    }
  }
)
```

### Styling System

**CSS Variables + HSL Color System** ([src/app/globals.css](src/app/globals.css)):
- Light and dark mode support via CSS custom properties
- Consistent spacing using `--radius` variable
- Primary color: zinc-based theme

**Tailwind CSS Configuration** ([tailwind.config.ts](tailwind.config.ts)):
- Content paths: `./src/**/*.{js,ts,jsx,tsx,mdx}`
- Dark mode: `["class"]` - controlled by adding `.dark` class
- Custom color palette mapped to CSS variables

### PWA Configuration

Uses [@ducanh2912/next-pwa](https://github.com/DuCanhGH/next-pwa):
- Manifest generation
- Service worker registration
- Disabled in development mode

## Development Rules

### Component Guidelines

**Server Components (Default):**
- Use for data fetching and static content
- No `'use client'` directive
- Can access server-side resources (database, cookies)

**Client Components:**
- Add `'use client'` directive at top of file
- Use for interactivity (forms, navigation, animations)
- Import client-side Supabase client

### Authentication

**Always verify authentication before user-specific operations:**

Server Components:
```typescript
const user = await getCurrentUser()
if (!user) {
  redirect('/login')
}
```

API Routes:
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Routing

**Route Groups** using parentheses create logical sections:
- `(auth)` - Authentication pages (no auth required)
- `(main)` - Protected application pages (auth required)
- `admin/` - Admin dashboard (admin role required)

**Navigation Components:**
- [Sidebar](src/components/layout/sidebar.tsx) - PC navigation (hidden on mobile)
- [BottomNav](src/components/layout/bottom-nav.tsx) - Mobile navigation (hidden on PC)
- Both use `usePathname()` for active state highlighting

### Form Handling

**Use react-hook-form + Zod for type-safe forms:**

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

const form = useForm({
  resolver: zodResolver(schema)
})
```

See [src/app/(auth)/login/page.tsx](src/app/(auth)/login/page.tsx) for example.

### Error Handling

**Use Sonner for toast notifications:**

```typescript
import { toast } from 'sonner'

toast.success('操作成功')
toast.error('操作失败: ' + error.message)
```

**Supabase Error Handling:**
```typescript
const { error } = await supabase.from('table').insert(data)
if (error) {
  console.error('Database error:', error)
  toast.error('操作失败，请重试')
}
```

## Key Dependencies and Versions

| Dependency | Version | Purpose |
|------------|---------|---------|
| next | 15.2.4 | React framework |
| react | 19.1.0 | UI library |
| typescript | 5 | Type safety |
| tailwindcss | 3.4.19 | Styling |
| @supabase/supabase-js | 2.49.1 | Backend client |
| @supabase/ssr | 0.9.0 | Server-side auth |
| zustand | 5.0.3 | State management |
| @radix-ui/react-* | ^1.1.11 | UI primitives |
| framer-motion | 11.18.0 | Animations |
| sonner | 1.7.4 | Toast notifications |
| react-hook-form | 7.71.2 | Form handling |
| zod | 3.25.76 | Schema validation |
| class-variance-authority | 0.7.0 | Component variants |
| lucide-react | 0.469.0 | Icons |
| @ducanh2912/next-pwa | 10.2.9 | PWA support |

## Naming Conventions

### Files and Directories

- **Pages**: kebab-case (`capture/page.tsx`, `user-profile/page.tsx`)
- **Components**: PascalCase (`Sidebar.tsx`, `UserProfile.tsx`)
- **Utilities**: camelCase (`cn.ts`, `formatDate.ts`)
- **Types**: PascalCase interfaces/types (`UserProfile.ts`, `UserRole.ts`)

### React Components

- **Functional components**: PascalCase (`export function Sidebar() {}`)
- **Props interfaces**: PascalCase with `Props` suffix (`interface SidebarProps {}`)
- **Custom hooks**: camelCase with `use` prefix (`export function useAuth() {}`)

### API Routes

- **Route files**: kebab-case (`api/payment/webhook/route.ts`)
- **Handler functions**: camelCase (`export async function POST() {}`)

### Database

- **Tables**: snake_case (`user_profiles`, `credit_transactions`)
- **Columns**: snake_case (`created_at`, `user_id`)
- **TypeScript interfaces**: PascalCase matching tables (`UserProfile`, `CreditTransaction`)

### CSS/Tailwind

- **Utility classes**: kebab-case (`bg-primary`, `text-zinc-500`)
- **Custom classes**: kebab-case (`.custom-class`)
- **CSS variables**: kebab-case with `--` prefix (`--primary-color`)

## Key Modules

### Authentication Module

**Purpose**: User authentication and authorization

**Key Files**:
- [src/middleware.ts](src/middleware.ts) - Route protection and auth validation
- [src/lib/supabase/client.ts](src/lib/supabase/client.ts) - Client-side auth
- [src/lib/supabase/server.ts](src/lib/supabase/server.ts) - Server-side auth helpers
- [src/app/(auth)/login/page.tsx](src/app/(auth)/login/page.tsx) - Login page
- [src/app/(auth)/register/page.tsx](src/app/(auth)/register/page.tsx) - Registration page
- [src/store/auth.ts](src/store/auth.ts) - Auth state management

**Features**:
- Email/password authentication
- Protected routes with middleware
- Role-based access control (user/admin)
- Automatic profile creation on signup

### Document Module

**Purpose**: Document capture and management

**Key Files**:
- [src/app/(main)/capture/page.tsx](src/app/(main)/capture/page.tsx) - Document creation
- [src/app/(main)/documents/[id]/page.tsx](src/app/(main)/documents/[id]/page.tsx) - Document details
- [src/types/index.ts](src/types/index.ts#L20) - Document type definitions

**Features**:
- Text input capture
- Voice input capture (planned)
- Character counting
- Document listing

### AI Analysis Module

**Purpose**: AI-powered document analysis using lenses

**Key Files**:
- [src/types/index.ts](src/types/index.ts#L35) - Lens and Insight type definitions
- [src/lib/prompts/](src/lib/prompts/) - AI prompt templates

**Lens Types**:
- `requirements` - Requirements analysis
- `meeting` - Meeting notes
- `review` - Code/document review
- `risk` - Risk assessment
- `change` - Change management
- `postmortem` - Postmortem analysis
- `tech` - Technical documentation
- `custom` - User-defined lenses

**Credit Calculation** ([src/types/index.ts#L171](src/types/index.ts#L171)):
```typescript
- ≤3,000 chars: 10 credits
- ≤6,000 chars: 15 credits
- ≤10,000 chars: 22 credits
- >10,000 chars: 22 + ceil((chars - 10000) / 1000) * 5
```

### Payment Module

**Purpose**: Credit-based payment system

**Key Files**:
- [src/app/api/payment/](src/app/api/payment/) - Payment API routes
- [src/app/(main)/profile/page.tsx](src/app/(main)/profile/page.tsx) - Payment UI
- [src/types/index.ts](src/types/index.ts#L79) - Payment type definitions

**Features**:
- Credit packages (入门包: 100 credits/¥10, 标准包: 500 credits/¥45, 专业包: 1200 credits/¥96)
- Hupijiao payment integration
- Webhook callbacks
- Transaction history
- Real-time credit balance

### Admin Module

**Purpose**: Administrative dashboard

**Key Files**:
- [src/app/admin/](src/app/admin/) - Admin pages
- [src/middleware.ts](src/middleware.ts#L57) - Admin route protection

**Features**:
- User management
- Transaction oversight
- System announcements
- Custom lens management

## API Endpoints

### Authentication

- `POST /api/auth/*` - Handled by Supabase Auth

### Payment

- `GET /api/payment/*` - Payment initiation
- `POST /api/payment/webhook` - Hupijiao webhook (no auth required)
- Route: [src/app/api/payment/webhook/route.ts](src/app/api/payment/webhook/route.ts)

### Feedback

- `POST /api/feedbacks/*` - Submit feedback

### Admin

- `GET /api/admin/*` - Admin data endpoints
- `POST /api/admin/*` - Admin actions

## Database Schema

### Core Tables

**profiles** ([src/lib/supabase/README.md#L155](src/lib/supabase/README.md#L155))
- `id` - UUID (matches auth.users.id)
- `username` - string | null
- `role` - 'user' | 'admin'
- `credits` - number
- `created_at`, `updated_at` - timestamps

**documents** ([src/types/index.ts#L20](src/types/index.ts#L20))
- `id` - UUID
- `user_id` - UUID
- `title` - string | null
- `raw_content` - string
- `char_count` - number
- `source_type` - 'text' | 'voice'
- `is_deleted` - boolean
- `created_at`, `updated_at` - timestamps

**custom_lenses** ([src/types/index.ts#L45](src/types/index.ts#L45))
- `id` - UUID
- `user_id` - UUID
- `name` - string
- `icon` - string
- `description` - string | null
- `system_prompt` - string
- `is_active` - boolean
- `created_at`, `updated_at` - timestamps

**insights** ([src/types/index.ts#L60](src/types/index.ts#L60))
- `id` - UUID
- `document_id` - UUID
- `user_id` - UUID
- `lens_type` - LensType
- `custom_lens_id` - UUID | null
- `result` - string (Markdown)
- `model` - string
- `prompt_version` - string
- `input_chars`, `input_tokens`, `output_tokens` - number | null
- `credits_cost` - number
- `created_at` - timestamp

**credit_transactions** ([src/types/index.ts#L81](src/types/index.ts#L81))
- `id` - UUID
- `user_id` - UUID
- `amount` - number (+ for credit, - for debit)
- `balance_after` - number
- `type` - 'payment' | 'manual_grant' | 'consumed' | 'admin_deduct' | 'refund'
- `description` - string | null
- `related_insight_id` - UUID | null
- `related_order_id` - UUID | null
- `operated_by` - UUID | null
- `created_at` - timestamp

**payment_orders** ([src/types/index.ts#L96](src/types/index.ts#L96))
- `id` - UUID
- `user_id` - UUID
- `out_trade_no` - string (merchant order ID)
- `platform_order` - string | null (payment platform order ID)
- `package_name` - string (入门包 | 标准包 | 专业包)
- `amount_fen` - number (amount in cents)
- `credits_granted` - number
- `payment_method` - string | null
- `status` - 'pending' | 'paid' | 'failed' | 'refunded'
- `paid_at` - timestamp | null
- `created_at` - timestamp

**feedbacks** ([src/types/index.ts#L125](src/types/index.ts#L125))
- `id` - UUID
- `user_id` - UUID
- `type` - 'payment' | 'bug' | 'feature' | 'other'
- `title` - string
- `content` - string
- `context_url` - string | null
- `related_order_id` - UUID | null
- `related_insight_id` - UUID | null
- `status` - 'pending' | 'processing' | 'resolved' | 'closed'
- `admin_note` - string | null
- `handled_by` - UUID | null
- `created_at`, `updated_at` - timestamps

**system_prompts** ([src/types/index.ts#L144](src/types/index.ts#L144))
- `id` - UUID
- `lens_type` - string
- `version` - string
- `system_prompt` - string
- `is_active` - boolean
- `notes` - string | null
- `created_by` - UUID | null
- `created_at` - timestamp

**announcements** ([src/types/index.ts#L157](src/types/index.ts#L157))
- `id` - UUID
- `title` - string
- `content` - string
- `type` - 'info' | 'warning' | 'maintenance'
- `is_active` - boolean
- `expires_at` - timestamp | null
- `created_by` - UUID | null
- `created_at` - timestamp

## Best Practices

### Server vs Client Components

**Use Server Components when:**
- Fetching data from Supabase
- Rendering static content
- No need for interactivity

**Use Client Components when:**
- Handling user input (forms, buttons)
- Using browser APIs (localStorage, navigator)
- Managing client-side state (Zustand)
- Using React hooks (useState, useEffect)

### Supabase Usage

**Server Components:**
```typescript
import { createServerClient } from '@/lib/supabase/server'

const supabase = await createServerClient()
const { data } = await supabase.from('documents').select('*')
```

**Client Components:**
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('documents').select('*')
```

**Type-Safe Queries:**
```typescript
import type { Tables, TablesInsert } from '@/lib/supabase/server'

const newDoc: TablesInsert<'documents'> = {
  user_id: userId,
  title: 'My Document',
  raw_content: 'Content'
}

const { data } = await supabase
  .from('documents')
  .insert(newDoc)
  .select()
  .single()
```

### Responsive Design

**PC First, Mobile Second:**
- Use Tailwind's responsive prefixes: `md:`, `lg:`, `xl:`
- Mobile styles come first, PC styles override with prefixes
- Test on both breakpoints before committing

**Example:**
```typescript
<div className="md:hidden">Mobile only</div>
<div className="hidden md:flex">PC only</div>
```

### Error Boundaries

**Always handle Supabase errors:**
```typescript
const { data, error } = await supabase.from('table').select('*')

if (error) {
  console.error('Error:', error)
  toast.error('操作失败')
  return
}

// Use data safely
if (!data) {
  toast.error('未找到数据')
  return
}
```

### Performance

**Server-Side Rendering:**
- Use Server Components for initial page loads
- Fetch data on the server, not in client useEffect
- Use React's `<Suspense>` for loading states

**Code Splitting:**
- Use dynamic imports for large components:
  ```typescript
  const HeavyChart = dynamic(() => import('./HeavyChart'), {
    loading: () => <Skeleton />
  })
  ```

## Common Pitfalls

### Authentication Issues

**Pitfall**: Accessing `getCurrentUser()` in client components

**Solution**: Use client-side Supabase client:
```typescript
// Wrong (Server Component)
import { getCurrentUser } from '@/lib/supabase/server'

// Correct (Client Component)
import { createClient } from '@/lib/supabase/client'
const { data: { user } } = await supabase.auth.getUser()
```

### Middleware Loops

**Pitfall**: Redirects causing infinite loops

**Solution**: Be explicit about redirect conditions:
```typescript
// Check auth first
if (PUBLIC_ROUTES.includes(pathname) && user) {
  return NextResponse.redirect(new URL('/', request.url))
}

// Only redirect to login if not on public route
if (!user && !PUBLIC_ROUTES.includes(pathname)) {
  return NextResponse.redirect(new URL('/login', request.url))
}
```

See [src/middleware.ts](src/middleware.ts#L43) for correct implementation.

### Type Errors After Schema Changes

**Pitfall**: Supabase types out of sync

**Solution**: Regenerate types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

### CSS Not Applying

**Pitfall**: Tailwind classes not working

**Solution**: Check content paths in [tailwind.config.ts](tailwind.config.ts#L5):
```typescript
content: [
  "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
]
```

### PWA Issues in Development

**Pitfall**: Service worker not working in dev

**Solution**: Expected behavior - PWA is disabled in development:
```typescript
disable: process.env.NODE_ENV === 'development'
```

## Environment Variables

Required environment variables ([.env.example](.env.example)):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# DeepSeek LLM
DEEPSEEK_API_KEY=sk-...

# Hupijiao Payment
HUPIJIAO_PID=your_merchant_id
HUPIJIAO_KEY=your_signing_key
HUPIJIAO_NOTIFY_URL=https://your-domain.com/api/payment/webhook

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Security Note**: Never commit `.env.local` or actual API keys.

## Security Configuration

### Next.js Security Headers ([next.config.ts](next.config.ts#L6))

- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer leakage
- `Content-Security-Policy` - Restrict resource sources
- `Permissions-Policy` - Limit sensitive APIs

### Allowed External Domains

- `*.supabase.co` - Database and auth
- `api.deepseek.com` - AI API
- `api.hupijiao.com` - Payment API

## Utilities

### cn() Function ([src/lib/utils.ts](src/lib/utils.ts))

Merges Tailwind classes with proper precedence:

```typescript
import { cn } from '@/lib/utils'

cn('base-class', conditional && 'conditional-class', 'override-class')
```

### Credit Calculation ([src/types/index.ts#L171](src/types/index.ts#L171))

```typescript
import { calculateCreditCost } from '@/types'

const cost = calculateCreditCost(charCount)
```

## Testing

No test framework is currently configured. Consider adding:
- Jest or Vitest for unit tests
- Playwright for E2E tests (per your TypeScript testing rules)

## Deployment

**Build**: `npm run build`
**Output**: `.next/` directory
**Hosting**: Vercel, Netlify, or any Node.js hosting

### PWA Deployment

- Ensure HTTPS is enabled (required for Service Workers)
- Verify manifest.json is accessible
- Test on real devices, not just emulators

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
