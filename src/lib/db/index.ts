import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// At build time (`next build` page data collection) DATABASE_URL is not always
// set; postgres-js does not actually connect until the first query, so we use
// a placeholder URL here. At runtime the real env var must be present.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://buildtime:buildtime@localhost:5432/buildtime"

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("[db] DATABASE_URL is not set — using placeholder. Connections will fail at first query.")
}

const client = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
})

export const db = drizzle(client, { schema, logger: process.env.NODE_ENV === "development" })
export type DB = typeof db
export { schema }
