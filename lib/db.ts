import path from "node:path";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";
import { EstimateSettings, LeadSubmission } from "@/lib/types";

type PgPoolLike = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

type LeadListItem = {
  id: number;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  zip: string;
  project_type: string;
};

export type LeadExportRecord = LeadListItem & {
  photos_json: string;
  inputs_json: string;
  estimate_json: string;
};

const POSTGRES_URL = process.env.POSTGRES_URL?.trim() || "";
const USE_POSTGRES = POSTGRES_URL.length > 0;

let sqliteDb: any = null;
let sqliteInitPromise: Promise<any> | null = null;
let pgPoolPromise: Promise<PgPoolLike> | null = null;

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

async function getSqliteConstructor(): Promise<new (dbPath: string) => any> {
  try {
    const sqliteModule = (await import("better-sqlite3")) as {
      default: new (dbPath: string) => any;
    };
    return sqliteModule.default;
  } catch {
    throw new Error("SQLite driver missing. Run: npm install better-sqlite3");
  }
}

function initializeSqliteSchema(db: any): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      zip TEXT NOT NULL,
      photos_json TEXT NOT NULL,
      project_type TEXT NOT NULL,
      inputs_json TEXT NOT NULL,
      estimate_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at_unix INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at_unix
      ON admin_sessions (expires_at_unix);
  `);

  const existingSettings = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get("estimate_settings") as { value?: string } | undefined;

  if (!existingSettings) {
    db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?)").run(
      "estimate_settings",
      JSON.stringify(DEFAULT_SETTINGS)
    );
  }
}

async function initSqlite(): Promise<any> {
  if (sqliteDb) return sqliteDb;

  if (!sqliteInitPromise) {
    sqliteInitPromise = (async () => {
      const Database = await getSqliteConstructor();

      const defaultSqlitePath =
        process.env.VERCEL || process.env.NODE_ENV === "production"
          ? "/tmp/steelhead-quick-estimate.sqlite"
          : path.join(process.cwd(), "data.sqlite");
      const primaryPath = process.env.SQLITE_PATH || defaultSqlitePath;
      const fallbackPath = "/tmp/steelhead-quick-estimate.sqlite";
      const candidatePaths = primaryPath === fallbackPath ? [primaryPath] : [primaryPath, fallbackPath];

      let lastError: Error | null = null;
      for (const dbPath of candidatePaths) {
        try {
          const db = new Database(dbPath);
          db.pragma("journal_mode = WAL");
          initializeSqliteSchema(db);
          return db;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      throw new Error(
        `Unable to initialize SQLite database${lastError ? `: ${lastError.message}` : ""}`
      );
    })();
  }

  try {
    sqliteDb = await sqliteInitPromise;
    return sqliteDb;
  } catch (error) {
    sqliteInitPromise = null;
    throw error;
  }
}

async function getPgPool(): Promise<PgPoolLike> {
  if (!USE_POSTGRES) {
    throw new Error("POSTGRES_URL is not configured");
  }

  if (!pgPoolPromise) {
    pgPoolPromise = (async () => {
      let PoolCtor: new (options: { connectionString: string; ssl?: false | { rejectUnauthorized: boolean } }) => PgPoolLike;
      try {
        const pgModule = (await import("pg")) as {
          Pool: new (options: { connectionString: string; ssl?: false | { rejectUnauthorized: boolean } }) => PgPoolLike;
        };
        PoolCtor = pgModule.Pool;
      } catch {
        throw new Error("Postgres driver missing. Run: npm install pg");
      }

      const ssl = process.env.POSTGRES_SSL === "disable" ? false : { rejectUnauthorized: false };
      const pool = new PoolCtor({
        connectionString: POSTGRES_URL,
        ssl
      });

      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS leads (
          id BIGSERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          zip TEXT NOT NULL,
          photos_json JSONB NOT NULL,
          project_type TEXT NOT NULL,
          inputs_json JSONB NOT NULL,
          estimate_json JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS admin_sessions (
          token_hash TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions (expires_at);
      `);

      await pool.query(
        `
          INSERT INTO app_settings (key, value)
          VALUES ($1, $2::jsonb)
          ON CONFLICT (key) DO NOTHING
        `,
        ["estimate_settings", JSON.stringify(DEFAULT_SETTINGS)]
      );

      return pool;
    })();
  }

  return pgPoolPromise;
}

function asJsonString(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function asCreatedAt(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

export function isUsingPostgres(): boolean {
  return USE_POSTGRES;
}

export async function getSettings(): Promise<EstimateSettings> {
  if (USE_POSTGRES) {
    const pool = await getPgPool();
    const row = (await pool.query("SELECT value FROM app_settings WHERE key = $1", ["estimate_settings"]))
      .rows[0] as { value: unknown };

    if (!row) {
      throw new Error("Missing settings row");
    }

    const parsed = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
    return parsed as EstimateSettings;
  }

  const db = await initSqlite();
  const row = db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get("estimate_settings") as { value: string };
  return JSON.parse(row.value) as EstimateSettings;
}

export async function updateSettings(next: EstimateSettings): Promise<void> {
  if (USE_POSTGRES) {
    const pool = await getPgPool();
    await pool.query(
      "UPDATE app_settings SET value = $1::jsonb WHERE key = $2",
      [JSON.stringify(next), "estimate_settings"]
    );
    return;
  }

  const db = await initSqlite();
  db.prepare("UPDATE app_settings SET value = ? WHERE key = ?").run(
    JSON.stringify(next),
    "estimate_settings"
  );
}

export async function createLead(lead: LeadSubmission): Promise<number> {
  if (USE_POSTGRES) {
    const pool = await getPgPool();
    const row = (
      await pool.query(
        `
          INSERT INTO leads (name, phone, email, zip, photos_json, project_type, inputs_json, estimate_json)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb)
          RETURNING id
        `,
        [
          lead.name,
          lead.phone,
          lead.email,
          lead.zip,
          JSON.stringify(lead.photos),
          lead.inputs.projectType,
          JSON.stringify(lead.inputs),
          JSON.stringify(lead.estimate)
        ]
      )
    ).rows[0] as { id: string | number };

    return Number(row.id);
  }

  const db = await initSqlite();
  const result = db
    .prepare(
      `
        INSERT INTO leads (name, phone, email, zip, photos_json, project_type, inputs_json, estimate_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      lead.name,
      lead.phone,
      lead.email,
      lead.zip,
      JSON.stringify(lead.photos),
      lead.inputs.projectType,
      JSON.stringify(lead.inputs),
      JSON.stringify(lead.estimate)
    );

  return Number(result.lastInsertRowid);
}

export async function listLeads(): Promise<LeadListItem[]> {
  if (USE_POSTGRES) {
    const pool = await getPgPool();
    const rows = (
      await pool.query(
        `
          SELECT id, created_at, name, phone, email, zip, project_type
          FROM leads
          ORDER BY created_at DESC
        `
      )
    ).rows;

    return rows.map((row) => ({
      id: Number(row.id),
      created_at: asCreatedAt(row.created_at),
      name: String(row.name),
      phone: String(row.phone),
      email: String(row.email),
      zip: String(row.zip),
      project_type: String(row.project_type)
    }));
  }

  const db = await initSqlite();
  return db
    .prepare(
      "SELECT id, created_at, name, phone, email, zip, project_type FROM leads ORDER BY datetime(created_at) DESC"
    )
    .all() as LeadListItem[];
}

export async function listLeadExports(): Promise<LeadExportRecord[]> {
  if (USE_POSTGRES) {
    const pool = await getPgPool();
    const rows = (
      await pool.query(
        `
          SELECT
            id,
            created_at,
            name,
            phone,
            email,
            zip,
            project_type,
            photos_json::text AS photos_json,
            inputs_json::text AS inputs_json,
            estimate_json::text AS estimate_json
          FROM leads
          ORDER BY created_at DESC
        `
      )
    ).rows;

    return rows.map((row) => ({
      id: Number(row.id),
      created_at: asCreatedAt(row.created_at),
      name: String(row.name),
      phone: String(row.phone),
      email: String(row.email),
      zip: String(row.zip),
      project_type: String(row.project_type),
      photos_json: asJsonString(row.photos_json),
      inputs_json: asJsonString(row.inputs_json),
      estimate_json: asJsonString(row.estimate_json)
    }));
  }

  const db = await initSqlite();
  return db
    .prepare(
      `
        SELECT id, created_at, name, phone, email, zip, project_type, photos_json, inputs_json, estimate_json
        FROM leads
        ORDER BY datetime(created_at) DESC
      `
    )
    .all() as LeadExportRecord[];
}

export async function getLeadExportById(id: number): Promise<LeadExportRecord | null> {
  if (USE_POSTGRES) {
    const pool = await getPgPool();
    const row = (
      await pool.query(
        `
          SELECT
            id,
            created_at,
            name,
            phone,
            email,
            zip,
            project_type,
            photos_json::text AS photos_json,
            inputs_json::text AS inputs_json,
            estimate_json::text AS estimate_json
          FROM leads
          WHERE id = $1
          LIMIT 1
        `,
        [id]
      )
    ).rows[0];

    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      created_at: asCreatedAt(row.created_at),
      name: String(row.name),
      phone: String(row.phone),
      email: String(row.email),
      zip: String(row.zip),
      project_type: String(row.project_type),
      photos_json: asJsonString(row.photos_json),
      inputs_json: asJsonString(row.inputs_json),
      estimate_json: asJsonString(row.estimate_json)
    };
  }

  const db = await initSqlite();
  const row = db
    .prepare(
      `
        SELECT id, created_at, name, phone, email, zip, project_type, photos_json, inputs_json, estimate_json
        FROM leads
        WHERE id = ?
        LIMIT 1
      `
    )
    .get(id) as LeadExportRecord | undefined;

  return row ?? null;
}

export async function createAdminSession(tokenHash: string, ttlSeconds: number): Promise<void> {
  const expiresUnix = nowUnix() + ttlSeconds;

  if (USE_POSTGRES) {
    const pool = await getPgPool();
    await pool.query(
      `
        INSERT INTO admin_sessions (token_hash, expires_at)
        VALUES ($1, to_timestamp($2))
      `,
      [tokenHash, expiresUnix]
    );
    return;
  }

  const db = await initSqlite();
  db.prepare("INSERT INTO admin_sessions (token_hash, expires_at_unix) VALUES (?, ?)").run(tokenHash, expiresUnix);
}

export async function deleteAdminSession(tokenHash: string): Promise<void> {
  if (USE_POSTGRES) {
    const pool = await getPgPool();
    await pool.query("DELETE FROM admin_sessions WHERE token_hash = $1", [tokenHash]);
    return;
  }

  const db = await initSqlite();
  db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(tokenHash);
}

export async function pruneExpiredAdminSessions(): Promise<void> {
  if (USE_POSTGRES) {
    const pool = await getPgPool();
    await pool.query("DELETE FROM admin_sessions WHERE expires_at <= NOW()");
    return;
  }

  const db = await initSqlite();
  db.prepare("DELETE FROM admin_sessions WHERE expires_at_unix <= ?").run(nowUnix());
}

export async function isAdminSessionValid(tokenHash: string): Promise<boolean> {
  if (USE_POSTGRES) {
    const pool = await getPgPool();
    const row = (
      await pool.query(
        `
          SELECT 1
          FROM admin_sessions
          WHERE token_hash = $1 AND expires_at > NOW()
          LIMIT 1
        `,
        [tokenHash]
      )
    ).rows[0];

    return Boolean(row);
  }

  const db = await initSqlite();
  const row = db
    .prepare(
      `
        SELECT 1
        FROM admin_sessions
        WHERE token_hash = ? AND expires_at_unix > ?
        LIMIT 1
      `
    )
    .get(tokenHash, nowUnix());

  return Boolean(row);
}
