---
name: FMP API migration to stable endpoints
description: Financial Modeling Prep (FMP) legacy v3 endpoints now return 403 for most keys; use the stable API instead.
---

Financial Modeling Prep retired free/legacy access to most `https://financialmodelingprep.com/api/v3/*` endpoints as of Aug 2025. Calling them now returns HTTP 403 with `"Error Message": "Legacy Endpoint ..."` even with a valid key.

**Why:** confirmed by direct curl testing — `/api/v3/search` returns 403, while the equivalent `/stable/*` path returns 200 with the same key.

**How to apply:** when integrating FMP, use the `stable` base (`https://financialmodelingprep.com/stable`) and these path/shape equivalents:
- `/api/v3/search` → `/stable/search-symbol?query=` (response fields: `symbol`, `name`, `currency`, `exchangeFullName`, `exchange` — no more `exchangeShortName`/`stockExchange`)
- `/api/v3/quote/{symbol}` → `/stable/quote?symbol=`
- `/api/v3/historical-price-full/{symbol}` → `/stable/historical-price-eod/full?symbol=` — response is a **plain array** now, not `{ historical: [...] }`
- `/api/v3/historical-chart/{interval}/{symbol}` → `/stable/historical-chart/{interval}?symbol=`

All `stable` endpoints take `symbol`/`query` as query params rather than path segments, and return most-recent-first arrays (reverse for chronological order).
