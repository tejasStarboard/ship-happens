"use client"

import { useState, useTransition } from "react"
import {
  IconLayersSubtract,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"
import type {
  CreateOverlayRuleInput,
  OverlayRuleMode,
  OverlayRuleView,
} from "@ship-happens/fill/browser"
import { Badge } from "@ship-happens/ui/components/badge"
import { Button } from "@ship-happens/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ship-happens/ui/components/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ship-happens/ui/components/empty"
import { Input } from "@ship-happens/ui/components/input"
import { Label } from "@ship-happens/ui/components/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ship-happens/ui/components/select"
import { Switch } from "@ship-happens/ui/components/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ship-happens/ui/components/table"
import { DataTableShell, PageChrome } from "@/components/shared/page-chrome"
import {
  createOverlayRule,
  deleteOverlayRule,
  listOverlayRules,
  updateOverlayRule,
} from "@/lib/server/actions/overlays"
import { parseSelectString } from "@/lib/preferences"

type RuleFormState = {
  name: string
  customer: string
  originLocode: string
  destLocode: string
  equipmentType: string
  mode: OverlayRuleMode
  projectedAmount: string
  markupPct: string
  markupAmount: string
  currency: string
  priority: string
  enabled: boolean
}

const EMPTY_FORM: RuleFormState = {
  name: "",
  customer: "",
  originLocode: "",
  destLocode: "",
  equipmentType: "",
  mode: "projected",
  projectedAmount: "",
  markupPct: "",
  markupAmount: "",
  currency: "USD",
  priority: "0",
  enabled: true,
}

function formFromRule(rule: OverlayRuleView): RuleFormState {
  return {
    name: rule.name,
    customer: rule.customer ?? "",
    originLocode: rule.originLocode ?? "",
    destLocode: rule.destLocode ?? "",
    equipmentType: rule.equipmentType ?? "",
    mode: rule.mode,
    projectedAmount: rule.projectedAmount ?? "",
    markupPct: rule.markupPct ?? "",
    markupAmount: rule.markupAmount ?? "",
    currency: rule.currency,
    priority: String(rule.priority),
    enabled: rule.enabled,
  }
}

function toCreateInput(form: RuleFormState): CreateOverlayRuleInput {
  const priority = Number.parseInt(form.priority, 10)
  return {
    name: form.name,
    customer: form.customer || null,
    originLocode: form.originLocode || null,
    destLocode: form.destLocode || null,
    equipmentType: form.equipmentType || null,
    mode: form.mode,
    projectedAmount:
      form.mode === "projected" ? form.projectedAmount || null : null,
    markupPct: form.mode === "markup" ? form.markupPct || null : null,
    markupAmount: form.mode === "markup" ? form.markupAmount || null : null,
    currency: form.currency || "USD",
    enabled: form.enabled,
    priority: Number.isFinite(priority) ? priority : 0,
  }
}

function ruleSummary(rule: OverlayRuleView): string {
  if (rule.mode === "projected") {
    return `${rule.projectedAmount ?? "—"} ${rule.currency}`
  }
  const parts: string[] = []
  if (rule.markupPct) parts.push(`+${rule.markupPct}%`)
  if (rule.markupAmount) parts.push(`+${rule.markupAmount}`)
  return parts.length > 0 ? `${parts.join(" / ")} ${rule.currency}` : "—"
}

function laneLabel(rule: OverlayRuleView): string {
  const o = rule.originLocode ?? "*"
  const d = rule.destLocode ?? "*"
  const e = rule.equipmentType ?? "*"
  return `${o} → ${d} · ${e}`
}

function RuleFormFields({
  form,
  onChange,
}: {
  form: RuleFormState
  onChange: (next: RuleFormState) => void
}) {
  const modeLabel =
    form.mode === "projected" ? "Projected sell" : "Markup on buy"

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="overlay-name">Name</Label>
        <Input
          id="overlay-name"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Acme SHA–LAX projected"
        />
      </div>
      <div className="grid gap-2">
        <Label>Mode</Label>
        <Select
          value={form.mode}
          onValueChange={(next) => {
            const parsed = parseSelectString(next)
            if (parsed !== "projected" && parsed !== "markup") return
            onChange({ ...form, mode: parsed })
          }}
        >
          <SelectTrigger>
            <SelectValue>{modeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="projected">Projected sell</SelectItem>
              <SelectItem value="markup">Markup on buy</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="overlay-customer">Customer (optional)</Label>
        <Input
          id="overlay-customer"
          value={form.customer}
          onChange={(e) => onChange({ ...form, customer: e.target.value })}
          placeholder="Leave blank for org-wide"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="overlay-origin">Origin</Label>
          <Input
            id="overlay-origin"
            value={form.originLocode}
            onChange={(e) =>
              onChange({ ...form, originLocode: e.target.value })
            }
            placeholder="Any"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="overlay-dest">Dest</Label>
          <Input
            id="overlay-dest"
            value={form.destLocode}
            onChange={(e) => onChange({ ...form, destLocode: e.target.value })}
            placeholder="Any"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="overlay-eq">Equipment</Label>
          <Input
            id="overlay-eq"
            value={form.equipmentType}
            onChange={(e) =>
              onChange({ ...form, equipmentType: e.target.value })
            }
            placeholder="Any"
          />
        </div>
      </div>
      {form.mode === "projected" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="overlay-projected">Projected amount</Label>
            <Input
              id="overlay-projected"
              inputMode="decimal"
              value={form.projectedAmount}
              onChange={(e) =>
                onChange({ ...form, projectedAmount: e.target.value })
              }
              placeholder="2000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="overlay-currency">Currency</Label>
            <Input
              id="overlay-currency"
              value={form.currency}
              onChange={(e) => onChange({ ...form, currency: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="overlay-pct">Markup %</Label>
            <Input
              id="overlay-pct"
              inputMode="decimal"
              value={form.markupPct}
              onChange={(e) => onChange({ ...form, markupPct: e.target.value })}
              placeholder="5"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="overlay-amt">Markup amount</Label>
            <Input
              id="overlay-amt"
              inputMode="decimal"
              value={form.markupAmount}
              onChange={(e) =>
                onChange({ ...form, markupAmount: e.target.value })
              }
              placeholder="150"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="overlay-currency-m">Currency</Label>
            <Input
              id="overlay-currency-m"
              value={form.currency}
              onChange={(e) => onChange({ ...form, currency: e.target.value })}
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="overlay-priority">Priority</Label>
          <Input
            id="overlay-priority"
            inputMode="numeric"
            value={form.priority}
            onChange={(e) => onChange({ ...form, priority: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch
            checked={form.enabled}
            onCheckedChange={(enabled) => onChange({ ...form, enabled })}
            id="overlay-enabled"
          />
          <Label htmlFor="overlay-enabled">Enabled</Label>
        </div>
      </div>
    </div>
  )
}

function CreateRuleDialog({
  onCreated,
}: {
  onCreated: (rule: OverlayRuleView) => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM)
  const [pending, startTransition] = useTransition()

  function onSubmit() {
    startTransition(async () => {
      const result = await createOverlayRule(toCreateInput(form))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onCreated(result.rule)
      setForm(EMPTY_FORM)
      setOpen(false)
      toast.success("Overlay rule created")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" />}>
        <IconPlus data-icon="inline-start" />
        Add rule
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New overlay rule</DialogTitle>
          <DialogDescription>
            Projected sells fill gaps when Starboard has no buy. Markup rules
            adjust priced buys. Blank lane fields match any lane.
          </DialogDescription>
        </DialogHeader>
        <RuleFormFields form={form} onChange={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending || !form.name.trim()}>
            Create
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
  rule: OverlayRuleView
  onUpdated: (rule: OverlayRuleView) => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RuleFormState>(() => formFromRule(rule))
  const [pending, startTransition] = useTransition()

  function onSubmit() {
    startTransition(async () => {
      const result = await updateOverlayRule(rule.id, toCreateInput(form))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onUpdated(result.rule)
      setOpen(false)
      toast.success("Overlay rule updated")
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
            aria-label="Edit rule"
          />
        }
      >
        <IconPencil />
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit overlay rule</DialogTitle>
          <DialogDescription>
            Customer-specific rules outrank org-wide when both match.
          </DialogDescription>
        </DialogHeader>
        <RuleFormFields form={form} onChange={setForm} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending || !form.name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OverlaysPanel({
  initialRules,
}: {
  initialRules: OverlayRuleView[]
}) {
  const [rules, setRules] = useState(initialRules)
  const [pending, startTransition] = useTransition()

  function refresh() {
    startTransition(async () => {
      const listed = await listOverlayRules()
      if (listed.ok) setRules(listed.rules)
      else toast.error(listed.error)
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteOverlayRule(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setRules((prev) => prev.filter((r) => r.id !== id))
      toast.success("Overlay rule deleted")
    })
  }

  return (
    <PageChrome
      title="Overlays"
      description="Projected sell rates when Starboard has no buy — or markup on priced buys. Applied during rate resolve."
      actions={<CreateRuleDialog onCreated={() => refresh()} />}
    >
      {rules.length === 0 ? (
        <Empty className="min-h-[280px] border border-dashed border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconLayersSubtract />
            </EmptyMedia>
            <EmptyTitle>No overlay rules yet</EmptyTitle>
            <EmptyDescription>
              Add an org-wide or customer rule. Fills apply matching rules after
              rates resolve and advance Progress overlay.
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
                  Scope
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Lane
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Rule
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
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {laneLabel(rule)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {rule.mode === "projected" ? "Projected" : "Markup"}
                      </Badge>
                      <span className="text-sm">{ruleSummary(rule)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.enabled ? "default" : "outline"}>
                      {rule.enabled ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <EditRuleDialog
                        rule={rule}
                        onUpdated={(updated) =>
                          setRules((prev) =>
                            prev.map((r) => (r.id === updated.id ? updated : r))
                          )
                        }
                      />
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Delete rule"
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
