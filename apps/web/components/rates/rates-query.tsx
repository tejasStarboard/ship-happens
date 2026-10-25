"use client"

import * as React from "react"
import { IconChevronDown, IconLoader2, IconSearch } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@workspace/ui/components/pagination"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import type {
  RateResultRow,
  RateResultSurcharge,
  RateSearchErrorKind,
  RateSearchLaneSummary,
  RateSearchPagination,
} from "@/lib/starboard/rate-result"
import { RATES_SEARCH_PAGE_SIZE } from "@/lib/starboard/rate-result"

type QueryFields = {
  origin: string
  destination: string
  equipment: string
  carrier: string
}

type SearchUiState =
  | { status: "idle" }
  | { status: "loading"; laneHint?: RateSearchLaneSummary }
  | {
      status: "ok"
      rows: RateResultRow[]
      lane: RateSearchLaneSummary
      companyId: string
      pagination: RateSearchPagination | null
      query: QueryFields
    }
  | {
      status: "empty"
      lane: RateSearchLaneSummary
      companyId: string
      pagination: RateSearchPagination | null
      query: QueryFields
    }
  | {
      status: "error"
      message: string
      kind?: RateSearchErrorKind
    }

type SearchApiResponse = {
  status: "ok" | "empty" | "error"
  message?: string
  kind?: RateSearchErrorKind
  companyId?: string
  lane?: RateSearchLaneSummary
  rows?: RateResultRow[]
  pagination?: RateSearchPagination | null
  error?: string
}

const SKELETON_ROW_COUNT = 5
const TABLE_COL_COUNT = 9

function money(
  amount: number | null,
  currency: string | null | undefined
): string {
  if (amount == null) return "—"
  const formatted = amount.toLocaleString()
  return currency ? `${formatted} ${currency}` : formatted
}

function channelLabel(channel: RateResultRow["channel"]): string {
  return channel === "contract" ? "Contract" : "Spot"
}

function portLabel(code: string, name: string | null): string {
  return name ? `${code} · ${name}` : code
}

function transitLabel(row: RateResultRow): string {
  if (row.transitMinDays == null && row.transitMaxDays == null) return "—"
  if (
    row.transitMinDays != null &&
    row.transitMaxDays != null &&
    row.transitMinDays !== row.transitMaxDays
  ) {
    return `${row.transitMinDays}–${row.transitMaxDays}d`
  }
  return `${row.transitMinDays ?? row.transitMaxDays}d`
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}/.test(day) ? day : value
}

function RatesTableHeader() {
  return (
    <TableHeader className="bg-muted">
      <TableRow>
        <TableHead className="w-8" />
        <TableHead>Origin</TableHead>
        <TableHead>Destination</TableHead>
        <TableHead>Carrier</TableHead>
        <TableHead>Container</TableHead>
        <TableHead>Channel</TableHead>
        <TableHead>Total</TableHead>
        <TableHead>Valid to</TableHead>
        <TableHead>Transit</TableHead>
      </TableRow>
    </TableHeader>
  )
}

function RatesLoadingState({ laneHint }: { laneHint?: RateSearchLaneSummary }) {
  const laneLabel = laneHint
    ? `${laneHint.origin} → ${laneHint.destination} (${laneHint.equipment})`
    : null

  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <IconLoader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        <p role="status">
          {laneLabel
            ? `Searching Starboard for ${laneLabel}…`
            : "Searching Starboard…"}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <RatesTableHeader />
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="size-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function SurchargeRows({ surcharges }: { surcharges: RateResultSurcharge[] }) {
  if (surcharges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No surcharges on this rate.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead>Surcharge</TableHead>
            <TableHead>Leg</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>In total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surcharges.map((surcharge, index) => (
            <TableRow key={`${surcharge.name}-${index}`}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span>{surcharge.name}</span>
                  {surcharge.note ? (
                    <span className="text-xs text-muted-foreground">
                      {surcharge.note}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {surcharge.leg ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {surcharge.usageUnit
                  ? `${money(surcharge.unitRate, surcharge.currency)} / ${surcharge.usageUnit}`
                  : money(surcharge.unitRate, surcharge.currency)}
              </TableCell>
              <TableCell className="tabular-nums">
                {money(
                  surcharge.amount ?? surcharge.unitRate,
                  surcharge.currency
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {surcharge.includedInTotal == null
                  ? "—"
                  : surcharge.includedInTotal
                    ? "Yes"
                    : "No"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RateDetailMeta({ row }: { row: RateResultRow }) {
  const items: { label: string; value: string }[] = [
    {
      label: "Base freight",
      value: money(row.baseAmount, row.currency),
    },
    {
      label: "Validity",
      value:
        row.validFrom || row.validTo
          ? `${formatDate(row.validFrom)} → ${formatDate(row.validTo)}`
          : "—",
    },
    {
      label: "Via",
      value:
        row.route ||
        [row.originVia, row.destinationVia].filter(Boolean).join(" / ") ||
        "—",
    },
    { label: "Service", value: row.serviceName ?? "—" },
    { label: "Vendor", value: row.vendorName ?? "—" },
    {
      label: "Vessel / sailing",
      value:
        [row.vesselName, formatDate(row.sailingDate)]
          .filter((v) => v && v !== "—")
          .join(" · ") || "—",
    },
    { label: "Product", value: row.productType ?? "—" },
  ]

  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="truncate">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function RateResultRowView({ row }: { row: RateResultRow }) {
  const [open, setOpen] = React.useState(false)
  const detailId = `rate-detail-${row.id}`

  return (
    <>
      <TableRow className={cn(open && "bg-muted/30")}>
        <TableCell className="w-8 px-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={
              open ? "Hide rate details" : "Show surcharges and rate details"
            }
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setOpen((prev) => !prev)}
          >
            <IconChevronDown
              className={cn(
                "size-4 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </TableCell>
        <TableCell>{portLabel(row.origin, row.originName)}</TableCell>
        <TableCell>{portLabel(row.destination, row.destinationName)}</TableCell>
        <TableCell>{row.carrier}</TableCell>
        <TableCell>{row.containerType}</TableCell>
        <TableCell>{channelLabel(row.channel)}</TableCell>
        <TableCell className="tabular-nums">
          {money(row.amount, row.currency)}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDate(row.validTo)}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {transitLabel(row)}
        </TableCell>
      </TableRow>
      {open ? (
        <TableRow>
          <TableCell colSpan={TABLE_COL_COUNT} className="bg-muted/20 p-0">
            <div
              id={detailId}
              className="flex flex-col gap-4 border-t px-4 py-4"
            >
              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Rate details
                </p>
                <RateDetailMeta row={row} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Surcharges ({row.surcharges.length})
                </p>
                <SurchargeRows surcharges={row.surcharges} />
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push("ellipsis")
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total - 1) pages.push("ellipsis")
  pages.push(total)
  return pages
}

function RatesPagination({
  pagination,
  disabled,
  onPageChange,
}: {
  pagination: RateSearchPagination
  disabled: boolean
  onPageChange: (page: number) => void
}) {
  if (pagination.totalPages <= 1) return null

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages} ·{" "}
        {pagination.totalCount.toLocaleString()} contract rates
        {pagination.page === 1 ? " (spot on page 1)" : ""}
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
          </PaginationItem>
          {pageNumbers(pagination.page, pagination.totalPages).map((item, i) =>
            item === "ellipsis" ? (
              <PaginationItem key={`e-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <Button
                  type="button"
                  variant={item === pagination.page ? "outline" : "ghost"}
                  size="icon"
                  disabled={disabled}
                  aria-current={item === pagination.page ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export function RatesQuery() {
  const [state, setState] = React.useState<SearchUiState>({ status: "idle" })

  function runSearch(
    query: QueryFields,
    page: number,
    cacheKey: string | null
  ) {
    const laneHint: RateSearchLaneSummary = {
      origin: query.origin || "CNSHA",
      destination: query.destination || "USLAX",
      equipment: query.equipment || "40HC",
      spotCarrier: query.carrier || "cma",
      serviceType: "ocean_fcl",
    }

    const params = new URLSearchParams()
    if (query.origin) params.set("origin", query.origin)
    if (query.destination) params.set("destination", query.destination)
    if (query.equipment) params.set("equipment", query.equipment)
    if (query.carrier) params.set("carrier", query.carrier)
    params.set("page", String(page))
    params.set("page_size", String(RATES_SEARCH_PAGE_SIZE))
    if (page > 1 && cacheKey) params.set("cache_key", cacheKey)

    setState({ status: "loading", laneHint })

    void (async () => {
      try {
        const response = await fetch(
          `/api/starboard/rates/search?${params.toString()}`,
          { cache: "no-store" }
        )
        const body = (await response.json()) as SearchApiResponse

        if (!response.ok || body.status === "error") {
          setState({
            status: "error",
            kind: body.kind,
            message:
              body.message ??
              body.error ??
              `Rate search failed (${response.status})`,
          })
          return
        }

        const lane = body.lane ?? laneHint
        const pagination = body.pagination ?? null

        if (body.status === "empty" || !body.rows?.length) {
          setState({
            status: "empty",
            companyId: body.companyId ?? "",
            lane,
            pagination,
            query,
          })
          return
        }

        setState({
          status: "ok",
          rows: body.rows,
          companyId: body.companyId ?? "",
          lane,
          pagination,
          query,
        })
      } catch (err) {
        setState({
          status: "error",
          message:
            err instanceof Error ? err.message : "Rate search request failed",
        })
      }
    })()
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    runSearch(
      {
        origin: String(form.get("origin") ?? "").trim(),
        destination: String(form.get("destination") ?? "").trim(),
        equipment: String(form.get("container") ?? "").trim(),
        carrier: String(form.get("carrier") ?? "").trim(),
      },
      1,
      null
    )
  }

  function onPageChange(page: number) {
    if (state.status !== "ok" && state.status !== "empty") return
    runSearch(state.query, page, state.pagination?.cacheKey ?? null)
  }

  const showLoading = state.status === "loading"
  const pagination =
    state.status === "ok" || state.status === "empty" ? state.pagination : null

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Starboard rates
        </h1>
        <p className="text-sm text-muted-foreground">
          Explore Starboard contract and spot rates via the live client. Same
          lookup path fills will use later — not a second rate database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Query</CardTitle>
          <CardDescription>
            Searches Starboard contract rates (paginated) and optional spot on
            page 1 (carrier slug defaults to CMA when empty). Expand a row for
            surcharges and validity from the Qv2 search shape.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="origin">Origin</FieldLabel>
                <Input
                  id="origin"
                  name="origin"
                  placeholder="CNSHA"
                  disabled={showLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="destination">Destination</FieldLabel>
                <Input
                  id="destination"
                  name="destination"
                  placeholder="USLAX"
                  disabled={showLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="container">Container</FieldLabel>
                <Input
                  id="container"
                  name="container"
                  placeholder="40HC"
                  disabled={showLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="carrier">
                  Carrier (spot, optional)
                </FieldLabel>
                <Input
                  id="carrier"
                  name="carrier"
                  placeholder="cma"
                  disabled={showLoading}
                />
              </Field>
            </FieldGroup>
            <div>
              <Button type="submit" size="sm" disabled={showLoading}>
                {showLoading ? (
                  <IconLoader2
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <IconSearch data-icon="inline-start" />
                )}
                {showLoading ? "Searching…" : "Search rates"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {state.status === "idle" ? (
        <p className="text-sm text-muted-foreground">
          Run a search to load live Starboard rates.
        </p>
      ) : null}

      {showLoading ? <RatesLoadingState laneHint={state.laneHint} /> : null}

      {state.status === "error" ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          role="alert"
        >
          <p className="font-medium text-destructive">Rate search failed</p>
          <p className="mt-1 text-muted-foreground">{state.message}</p>
          {state.kind ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Kind: {state.kind}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.status === "empty" ? (
        <p className="text-sm text-muted-foreground" role="status">
          No contract or spot rates for {state.lane.origin} →{" "}
          {state.lane.destination} ({state.lane.equipment}).
        </p>
      ) : null}

      {state.status === "ok" ? (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <RatesTableHeader />
              <TableBody>
                {state.rows.map((rate) => (
                  <RateResultRowView key={rate.id} row={rate} />
                ))}
              </TableBody>
            </Table>
          </div>
          {pagination ? (
            <RatesPagination
              pagination={pagination}
              disabled={showLoading}
              onPageChange={onPageChange}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
