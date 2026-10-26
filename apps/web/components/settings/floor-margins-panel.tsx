"use client"

import { useState, useTransition } from "react"
import {
  IconPercentage,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import type {
  CreateMarginFloorRuleInput,
  MarginFloorRuleView,
} from "@ship-happens/fill/browser"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { DataTableShell, PageChrome } from "@/components/shared/page-chrome"
import {
  createMarginFloorRule,
  deleteMarginFloorRule,
  listMarginFloorRules,
  updateMarginFloorRule,
} from "@/lib/server/actions/margin-floors"

type RuleFormState = {
  name: string
  customer: string
  minAmount: string
  minPct: string
  currency: string
  priority: string
  enabled: boolean
}

const EMPTY_FORM: RuleFormState = {
  name: "",
  customer: "",
  minAmount: "150",
  minPct: "5",
  currency: "USD",
  priority: "0",
  enabled: true,
}

function formFromRule(rule: MarginFloorRuleView): RuleFormState {
  return {
    name: rule.name,
    customer: rule.customer ?? "",
    minAmount: rule.minAmount ?? "",
    minPct: rule.minPct ?? "",
    currency: rule.currency,
    priority: String(rule.priority),
    enabled: rule.enabled,
  }
}

function toCreateInput(form: RuleFormState): CreateMarginFloorRuleInput {
  const priority = Number.parseInt(form.priority, 10)
  return {
    name: form.name,
    customer: form.customer || null,
    minAmount: form.minAmount || null,
    minPct: form.minPct || null,
    currency: form.currency || "USD",
    enabled: form.enabled,
    priority: Number.isFinite(priority) ? priority : 0,
  }
}

function floorSummary(rule: MarginFloorRuleView): string {
  const parts: string[] = []
  if (rule.minAmount) parts.push(`≥ $${rule.minAmount}`)
  if (rule.minPct) parts.push(`≥ ${rule.minPct}%`)
  return parts.length > 0 ? `${parts.join(" and ")} ${rule.currency}` : "—"
}

function RuleFormFields({
  form,
  onChange,
}: {
  form: RuleFormState
  onChange: (next: RuleFormState) => void
}) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="floor-name">Name</Label>
        <Input
          id="floor-name"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Org default floor"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="floor-customer">Customer (optional)</Label>
        <Input
          id="floor-customer"
          value={form.customer}
          onChange={(e) => onChange({ ...form, customer: e.target.value })}
          placeholder="Leave blank for org-wide"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="floor-min-amount">Min $/FEU</Label>
          <Input
            id="floor-min-amount"
            inputMode="decimal"
            value={form.minAmount}
            onChange={(e) => onChange({ ...form, minAmount: e.target.value })}
            placeholder="150"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="floor-min-pct">Min gross %</Label>
          <Input
            id="floor-min-pct"
            inputMode="decimal"
            value={form.minPct}
            onChange={(e) => onChange({ ...form, minPct: e.target.value })}
            placeholder="5"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="floor-currency">Currency</Label>
          <Input
            id="floor-currency"
            value={form.currency}
            onChange={(e) => onChange({ ...form, currency: e.target.value })}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Both thresholds apply when set (AND). Clear a field to disable that
        rule. Projected-only lanes (no buy) are not checked.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="floor-priority">Priority</Label>
          <Input
            id="floor-priority"
            inputMode="numeric"
            value={form.priority}
            onChange={(e) => onChange({ ...form, priority: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch
            checked={form.enabled}
            onCheckedChange={(enabled) => onChange({ ...form, enabled })}
            id="floor-enabled"
          />
          <Label htmlFor="floor-enabled">Enabled</Label>
        </div>
      </div>
    </div>
  )
}

function CreateRuleDialog({
  onCreated,
}: {
  onCreated: (rule: MarginFloorRuleView) => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM)
  const [pending, startTransition] = useTransition()

  function onSubmit() {
    startTransition(async () => {
      const result = await createMarginFloorRule(toCreateInput(form))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onCreated(result.rule)
      setForm(EMPTY_FORM)
      setOpen(false)
      toast.success("Floor rule created")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" />}>
        <IconPlus data-icon="inline-start" />
        Add floor
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New floor-margin rule</DialogTitle>
          <DialogDescription>
            Breaches open Waiting on you reviews during rate/overlay resolve.
          </DialogDescription>
        </DialogHeader>
        <RuleFormFields form={form} onChange={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={pending || !form.name.trim()} onClick={onSubmit}>
            {pending ? "Saving…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditRuleDialog({
  rule,
  onUpdated,
}: {
  rule: MarginFloorRuleView
  onUpdated: (rule: MarginFloorRuleView) => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RuleFormState>(() => formFromRule(rule))
  const [pending, startTransition] = useTransition()

  function onSubmit() {
    startTransition(async () => {
      const result = await updateMarginFloorRule(rule.id, toCreateInput(form))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onUpdated(result.rule)
      setOpen(false)
      toast.success("Floor rule updated")
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setForm(formFromRule(rule))
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Edit floor rule"
          />
        }
      >
        <IconPencil />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit floor-margin rule</DialogTitle>
          <DialogDescription>{rule.name}</DialogDescription>
        </DialogHeader>
        <RuleFormFields form={form} onChange={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={pending || !form.name.trim()} onClick={onSubmit}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FloorMarginsPanel({
  initialRules,
}: {
  initialRules: MarginFloorRuleView[]
}) {
  const [rules, setRules] = useState(initialRules)
  const [pending, startTransition] = useTransition()

  function refresh() {
    startTransition(async () => {
      const result = await listMarginFloorRules()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setRules(result.rules)
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMarginFloorRule(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setRules((prev) => prev.filter((r) => r.id !== id))
      toast.success("Floor rule deleted")
    })
  }

  return (
    <PageChrome
      title="Floor margins"
      description="Minimum $/FEU and gross % guardrails. Breaches open Waiting on you reviews after overlay apply."
      actions={<CreateRuleDialog onCreated={() => refresh()} />}
    >
      {rules.length === 0 ? (
        <Empty className="min-h-[280px] border border-dashed border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconPercentage />
            </EmptyMedia>
            <EmptyTitle>No floor rules yet</EmptyTitle>
            <EmptyDescription>
              Add an org or customer floor (e.g. +$150/FEU and 5% gross). With
              no enabled rules, overlay resolve will not open margin reviews.
            </EmptyDescription>
          </EmptyHeader>
          <CreateRuleDialog onCreated={() => refresh()} />
        </Empty>
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Floor
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Priority
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="h-[38px] w-24 text-right text-xs font-medium text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.customer ?? "Org-wide"}
                  </TableCell>
                  <TableCell>{floorSummary(rule)}</TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>
                    <Badge variant={rule.enabled ? "default" : "outline"}>
                      {rule.enabled ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <EditRuleDialog
                        rule={rule}
                        onUpdated={(next) =>
                          setRules((prev) =>
                            prev.map((r) => (r.id === next.id ? next : r))
                          )
                        }
                      />
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Delete floor rule"
                        disabled={pending}
                        onClick={() => onDelete(rule.id)}
                      >
                        <IconTrash />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </PageChrome>
  )
}
