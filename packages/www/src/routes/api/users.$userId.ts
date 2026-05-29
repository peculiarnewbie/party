import { Effect } from "effect";
import { createFileRoute } from '@tanstack/solid-router'
import { json } from '@tanstack/solid-start'
import type { User } from '~/utils/users'

export const Route = createFileRoute('/api/users/$userId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        Effect.runSync(Effect.logInfo("Fetching user by id").pipe(Effect.annotateLogs({ component: "route", route: "/api/users/$userId", userId: params.userId, url: request.url })));
        try {
          const res = await fetch(
            'https://jsonplaceholder.typicode.com/users/' + params.userId,
          )
          if (!res.ok) {
            throw new Error('Failed to fetch user')
          }

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          const user = (await res.json()) as User

          return json({
            id: user.id,
            name: user.name,
            email: user.email,
          })
        } catch (e) {
          Effect.runSync(Effect.logError("User not found").pipe(Effect.annotateLogs({ component: "route", route: "/api/users/$userId", userId: params.userId })));
          return json({ error: 'User not found' }, { status: 404 })
        }
      },
    },
  },
})
