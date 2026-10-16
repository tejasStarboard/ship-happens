import { z } from "zod"

/** Mirrors apps/webapp/types/qv2/schemas.ts → SearchRatesRequestSchema (subset). */
export const ServiceTypeSchema = z.enum([
  "ocean_fcl",
  "ocean_lcl",
  "air",
  "origin_drayage",
  "destination_drayage",
  "origin_cartage",
  "destination_cartage",
])

export type ServiceType = z.infer<typeof ServiceTypeSchema>

const CargoTypeSchema = z.enum([
  "cargo",
  "container",
  "pallet",
  "box",
  "volume",
  "weight",
  "crate",
  "package",
])

const ContainerTypeSchema = z.enum([
  "20GP",
  "20HC",
  "40GP",
  "40HC",
  "45GP",
  "45HC",
  "20REEF",
  "40REEF",
  "40RH",
  "20OT",
  "40OT",
  "20FR",
  "40FR",
  "40NOR",
])

const AddressSchema = z
  .object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country_code: z.string().optional(),
    unlocode: z.string().optional(),
  })
  .passthrough()

export const ContractSearchInputSchema = z
  .object({
    service_type: ServiceTypeSchema,
    origin_locode: z.string().min(1).optional(),
    destination_locode: z.string().min(1).optional(),
    origin_locodes: z.array(z.string().min(1)).optional(),
    destination_locodes: z.array(z.string().min(1)).optional(),
    origin_via_locode: z.string().optional(),
    destination_via_locode: z.string().optional(),
    origin_via_locodes: z.array(z.string()).optional(),
    destination_via_locodes: z.array(z.string()).optional(),
    origin_address: AddressSchema.nullable().optional(),
    destination_address: AddressSchema.nullable().optional(),
    cargo: z
      .object({
        cargo_type: CargoTypeSchema,
        container_type: ContainerTypeSchema.optional(),
        container_types: z.array(ContainerTypeSchema).optional(),
        pieces: z.number().int().positive().optional(),
        weight_kg: z.number().positive().optional(),
        volume_cbm: z.number().positive().optional(),
        weight_per_container_by_type: z
          .record(z.string(), z.number().positive())
          .optional(),
      })
      .passthrough(),
    effective_from: z.string().optional(),
    expires_on: z.string().optional(),
    vendor_company_ids: z.array(z.string()).optional(),
    carrier_names: z.array(z.string()).optional(),
    commodity_filter: z.string().optional(),
    transit_time_max: z.number().positive().optional(),
    agent_filter: z.string().optional(),
    exclude_adhoc: z.boolean().optional(),
    customer_company_id: z.string().uuid().optional(),
    page: z.number().int().positive().optional(),
    page_size: z.number().int().positive().max(200).optional(),
    cache_key: z.string().optional(),
    limit: z.number().int().positive().optional(),
    sort_by: z.enum(["price", "transit_time"]).optional(),
    sort_dir: z.enum(["asc", "desc"]).optional(),
    sort_equipment_type: z.string().optional(),
  })
  .passthrough()

export type ContractSearchInput = z.infer<typeof ContractSearchInputSchema>

export const SpotSearchInputSchema = z
  .object({
    carrier: z.string().min(1),
    origin_locodes: z.array(z.string()).optional(),
    destination_locodes: z.array(z.string()).optional(),
    container_types: z.array(z.string()).optional(),
    departure_date: z.string().optional(),
  })
  .passthrough()

export type SpotSearchInput = z.infer<typeof SpotSearchInputSchema>
