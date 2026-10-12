import * as React from "react"
import { IconSearch } from "@tabler/icons-react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { MOCK_RATE_RESULTS } from "@/lib/mock/rates"

export function RatesQuery() {
  const [queried, setQueried] = React.useState(false)

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rates</h1>
        <p className="text-sm text-muted-foreground">
          Query Starboard contract rates (mock results for now).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Query</CardTitle>
          <CardDescription>
            Filters will hit `SANDBOX_STARBOARD_DB_URL` / rate adapter later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              setQueried(true)
            }}
          >
            <FieldGroup className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="origin">Origin</FieldLabel>
                <Input id="origin" name="origin" placeholder="CNSHA" />
              </Field>
              <Field>
                <FieldLabel htmlFor="destination">Destination</FieldLabel>
                <Input
                  id="destination"
                  name="destination"
                  placeholder="USLAX"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="container">Container</FieldLabel>
                <Input id="container" name="container" placeholder="40HC" />
              </Field>
            </FieldGroup>
            <div>
              <Button type="submit" size="sm">
                <IconSearch data-icon="inline-start" />
                Search rates
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {queried ? (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Container</TableHead>
                <TableHead>Rate (USD)</TableHead>
                <TableHead>Valid until</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_RATE_RESULTS.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>{rate.origin}</TableCell>
                  <TableCell>{rate.destination}</TableCell>
                  <TableCell>{rate.carrier}</TableCell>
                  <TableCell>{rate.containerType}</TableCell>
                  <TableCell className="tabular-nums">
                    {rate.rateUsd.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rate.validUntil}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Run a search to see mock rate rows.
        </p>
      )}
    </div>
  )
}
