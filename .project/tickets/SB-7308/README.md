# SB-7308 — T1 Extend resolve port with contract service facts

Widen `ResolvedRateCandidate` + starboard-rates-adapter so transit, free_time, service_name, and validity survive resolve.

## AC

1. Port includes transit_time_days, service_name, effective_from/expires_on, free_time from hit rate_items.
2. Unit tests: fixture hit with transit_time + origin_free_time free_usage survives adapter → port.
