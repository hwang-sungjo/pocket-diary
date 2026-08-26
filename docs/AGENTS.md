# Codex Project Instructions

## Project context

This repository contains the Pocket Diary household-ledger application.

Before planning or implementing product work, read [`PRODUCT_PLAN.md`](./PRODUCT_PLAN.md) completely. It is the source of truth for product scope, feature priority, business rules, data modeling, and acceptance criteria.

## Working rules

- Complete P0 behavior before adding P1 or P2 features unless the user explicitly changes the priority.
- Keep iPhone and Web behavior aligned.
- Store KRW amounts as integer won values; never use floating-point arithmetic for money.
- Treat a transaction and its line items as separate entities.
- Never double-count a transaction total and its line-item totals in statistics.
- Keep UI, local persistence, and remote synchronization behind clear repository interfaces.
- Do not commit secrets, service-role keys, OAuth client secrets, or production tokens.
- Apply and test Row Level Security for every user-owned table exposed through Supabase.
- Update `PRODUCT_PLAN.md` when an approved product or data-model decision changes.
- Run relevant tests, type checks, and lint checks after implementation and report the results.

