# CI Baseline Schema

## Purpose

This directory contains a pre-generated SQL baseline for GitHub Actions CI tests only.

It is **NOT** used for production migrations on Render or staging environments.

## Why Separate from Migrations?

The historical migration chain (backend/prisma/migrations) contains migrations with timestamps that sort in an order incompatible with strict alphabetical execution. Rather than risking production by renaming historical migrations, we use a clean baseline for CI tests.

## Generation

The baseline schema.sql is generated from schema.prisma:

```bash
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > backend/prisma/ci-baseline/schema.sql
```

This ensures the baseline is always in sync with the current data model.

## Usage

**GitHub Actions CI only:**
1. Start a clean PostgreSQL container
2. Apply the baseline: `psql -f backend/prisma/ci-baseline/schema.sql`
3. Verify no schema drift: `npx prisma migrate diff --from-url "$TEST_DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code`
4. Run integration tests against this baseline

**Production (Render) and Staging:**
- Always use: `npx prisma migrate deploy`
- Never apply the CI baseline to production/staging
- Historical migrations remain untouched

## Maintenance

When schema.prisma changes and is deployed:
1. Regenerate the baseline: `npm run ci:baseline:generate`
2. Commit the updated schema.sql
3. Push to the branch

Future migrations after the baseline is created:
- They should be designed to work both in the historical chain (Render) AND after the baseline (CI)
- Or document CI-specific handling in this README

## Safety Guarantees

- ✅ Historical migration names never change
- ✅ Production (Render) uses only `npx prisma migrate deploy`
- ✅ CI baseline is auto-generated, never hand-written
- ✅ Baseline must have zero schema drift vs schema.prisma
