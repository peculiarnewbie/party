import { Effect } from "effect";
import { createFileRoute } from '@tanstack/solid-router'
import { getRequestHeaders } from '@tanstack/solid-start/server'
import { createMiddleware, json } from '@tanstack/solid-start'
import type { User } from '~/utils/users'

const userLoggerMiddleware = createMiddleware().server(async ({ next }) => {
  Effect.runSync(Effect.logInfo("In: /users").pipe(Effect.annotateLogs({ component: "route", route: "/api/users" })));
  Effect.runSync(Effect.logInfo("Request Headers").pipe(Effect.annotateLogs({ component: "route", route: "/api/users", headers: JSON.stringify(getRequestHeaders()) })));
  const result = await next()
  result.response.headers.set('x-users', 'true')
  Effect.runSync(Effect.logInfo("Out: /users").pipe(Effect.annotateLogs({ component: "route", route: "/api/users" })));
  return result
})

const testParentMiddleware = createMiddleware().server(async ({ next }) => {
  Effect.runSync(Effect.logInfo("In: testParentMiddleware").pipe(Effect.annotateLogs({ component: "route", middleware: "testParent" })));
  const result = await next()
  result.response.headers.set('x-test-parent', 'true')
  Effect.runSync(Effect.logInfo("Out: testParentMiddleware").pipe(Effect.annotateLogs({ component: "route", middleware: "testParent" })));
  return result
})

const testMiddleware = createMiddleware()
  .middleware([testParentMiddleware])
  .server(async ({ next }) => {
    Effect.runSync(Effect.logInfo("In: testMiddleware").pipe(Effect.annotateLogs({ component: "route", middleware: "test" })));
    const result = await next()
    result.response.headers.set('x-test', 'true')
    Effect.runSync(Effect.logInfo("Out: testMiddleware").pipe(Effect.annotateLogs({ component: "route", middleware: "test" })));
    return result
  })

export const Route = createFileRoute('/api/users')({
  server: {
    middleware: [testMiddleware, userLoggerMiddleware],
    handlers: {
      GET: async ({ request, context }) => {
        Effect.runSync(Effect.logInfo("GET /api/users").pipe(Effect.annotateLogs({ component: "route", route: "/api/users", url: request.url })));
        const res = await fetch('https://jsonplaceholder.typicode.com/users')
        if (!res.ok) {
          Effect.runSync(Effect.logError("Failed to fetch users").pipe(Effect.annotateLogs({ component: "route", route: "/api/users", status: res.status })));
          throw new Error('Failed to fetch users')
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const data = (await res.json()) as Array<User>

        const list = data.slice(0, 10)

        return json(
          list.map((u) => ({ id: u.id, name: u.name, email: u.email })),
        )
      },
    },
  },
})
