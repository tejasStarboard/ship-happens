import { resolveAuthSession } from "./auth/resolveSession.js"
import type { AuthSession } from "./auth/types.js"
import { loadConfig, type Config } from "./config.js"
import { StarboardHttp } from "./http/starboardHttp.js"
import { GlobalsModule } from "./modules/globals/index.js"
import { LocationsModule } from "./modules/locations/index.js"
import { MarginsModule } from "./modules/margins/index.js"
import { RatesModule } from "./modules/rates/index.js"

export type CreateClientOptions = {
  appDomain?: string
  handshakeKey?: string
  clientId?: string
  clientSecret?: string
  companyId?: string
  authorizationHeader?: string
  fetchImpl?: typeof fetch
  /** Pre-built config (from loadConfig). */
  config?: Config
}

export class StarboardClient {
  readonly rates: RatesModule
  readonly globals: GlobalsModule
  readonly locations: LocationsModule
  readonly margins: MarginsModule

  constructor(private readonly http: StarboardHttp) {
    this.rates = new RatesModule(http)
    this.globals = new GlobalsModule(http)
    this.locations = new LocationsModule(http)
    this.margins = new MarginsModule()
  }

  get companyId(): string {
    return this.http.companyId
  }

  get clientId(): string | null {
    return this.http.clientId
  }

  /** Low-level HTTP (advanced). Prefer module methods. */
  get raw(): StarboardHttp {
    return this.http
  }
}

function configFromOptions(opts: CreateClientOptions): Config {
  if (opts.config) return opts.config
  if (opts.appDomain && opts.handshakeKey) {
    return {
      appDomain: opts.appDomain.replace(/\/$/, ""),
      handshakeKey: opts.handshakeKey,
      clientId: opts.clientId ?? null,
      clientSecret: opts.clientSecret ?? null,
      companyId:
        opts.clientId && opts.clientSecret ? null : (opts.companyId ?? null),
    }
  }
  return loadConfig()
}

/**
 * Authenticate and return a scoped Starboard client.
 * Company tenancy comes from verified client credentials (or dev company id).
 */
export async function createClient(
  opts: CreateClientOptions = {}
): Promise<StarboardClient> {
  const base = configFromOptions(opts)
  const config: Config = {
    ...base,
    clientId: opts.clientId ?? base.clientId,
    clientSecret: opts.clientSecret ?? base.clientSecret,
    companyId:
      (opts.clientId ?? base.clientId) &&
      (opts.clientSecret ?? base.clientSecret)
        ? null
        : (opts.companyId ?? base.companyId),
  }

  const session: AuthSession = await resolveAuthSession({
    config,
    authorizationHeader: opts.authorizationHeader,
    fetchImpl: opts.fetchImpl,
  })

  const http = new StarboardHttp(
    config.appDomain,
    config.handshakeKey,
    session,
    opts.fetchImpl ?? fetch
  )
  return new StarboardClient(http)
}
