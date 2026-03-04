# Supabase Client Setup

This directory contains the Supabase client configuration and utilities for the Crusher application.

## File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Client-side Supabase client
│   │   ├── server.ts       # Server-side Supabase client and utilities
│   │   └── examples.ts     # Usage examples
│   └── utils.ts            # cn utility for Tailwind CSS
└── types/
    └── supabase.ts         # Database type definitions
```

## Installation

The required dependencies are already in `package.json`:

```bash
npm install clsx tailwind-merge class-variance-authority
```

## Usage

### Client Components

For client-side usage (React components with `'use client'`):

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export default function MyComponent() {
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return <button onClick={handleSignOut}>Sign Out</button>
}
```

### Server Components

For server-side usage (Server Components, API routes):

```tsx
import { getCurrentUser, createServerClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please sign in</div>
  }

  const supabase = createServerClient()
  const { data } = await supabase.from('chat_sessions').select('*')

  return <div>Hello {user.email}</div>
}
```

### Server Actions

```tsx
'use server'

import { getCurrentUser, createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSession(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = createServerClient()
  const title = formData.get('title') as string

  await supabase.from('chat_sessions').insert({
    user_id: user.id,
    title,
    model: 'gpt-4',
  })

  revalidatePath('/dashboard')
}
```

### Type-Safe Queries

The server client exports type helpers for better type safety:

```tsx
import type {
  Tables,
  TablesInsert,
  TablesUpdate
} from '@/lib/supabase/server'

async function createSession(
  userId: string,
  title: string
): Promise<Tables<'chat_sessions'> | null> {
  const supabase = createServerClient()

  const newSession: TablesInsert<'chat_sessions'> = {
    user_id: userId,
    title,
    model: 'gpt-4',
  }

  const { data } = await supabase
    .from('chat_sessions')
    .insert(newSession)
    .select()
    .single()

  return data
}
```

### Authentication Helpers

The server client provides convenient authentication helpers:

```tsx
import {
  getCurrentUser,
  getCurrentProfile,
  isAdmin
} from '@/lib/supabase/server'

// Get current authenticated user
const user = await getCurrentUser()

// Get user's profile data
const profile = await getCurrentProfile()

// Check if user has admin role
const admin = await isAdmin()
```

## Database Schema

The application includes the following tables:

### Tables

- **profiles**: User profiles with role and preferences
- **chat_sessions**: Chat conversation sessions
- **chat_messages**: Individual messages in conversations
- **knowledge_bases**: Knowledge base collections
- **documents**: Documents in knowledge bases
- **document_chunks**: Chunks of documents for vector search
- **api_keys**: API keys for external access
- **usage_logs**: API usage tracking
- **settings**: User-specific settings

### Views

- **chat_session_stats**: Statistics for chat sessions
- **knowledge_base_stats**: Statistics for knowledge bases
- **user_usage_stats**: Usage statistics per user

### Functions

- **search_document_chunks**: Vector search for document chunks
- **get_user_profile**: Fetch user profile
- **update_user_last_active**: Update user's last active timestamp

## Environment Variables

Make sure these environment variables are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Type Safety

All Supabase queries are fully type-safe thanks to the `Database` type definition in `src/types/supabase.ts`. The type definitions are automatically generated from your Supabase project.

To update types after schema changes:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

## Best Practices

1. **Use client.ts in client components** - For client-side interactivity
2. **Use server.ts in server components** - For server-side rendering and API routes
3. **Always check authentication** - Use `getCurrentUser()` before user-specific operations
4. **Type-safe inserts/updates** - Use `TablesInsert` and `TablesUpdate` types
5. **Error handling** - Always check for errors in Supabase operations
6. **Revalidate paths** - Use `revalidatePath()` after data mutations in Server Actions

## Troubleshooting

### "Module not found" errors

Make sure the path alias `@/*` is configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Authentication issues

- Ensure cookies are properly configured in Next.js
- Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set
- Verify the auth helpers are correctly installed

### Type errors

If you see type errors after schema changes, regenerate the types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

## Additional Resources

- [Supabase Next.js Auth Helpers](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase TypeScript Guide](https://supabase.com/docs/guides/api/generating-types)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
