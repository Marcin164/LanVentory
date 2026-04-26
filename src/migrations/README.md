# Database migrations

This folder holds TypeORM migrations. The runtime app (`nest start`) auto-runs
pending migrations on boot when `TYPEORM_SYNCHRONIZE=false` (the production
default). For dev convenience you can flip `TYPEORM_SYNCHRONIZE=true` in `.env`
which lets TypeORM mutate the schema on the fly — never do this in prod, it
will silently drop columns when you rename a property.

## Generating a baseline

The repo currently has zero migrations and a live database produced by
`synchronize:true`. To freeze that state into a migration:

```bash
# 1. Make sure your .env points at a *clone* of prod (not prod itself).
# 2. Diff the entities against the live schema and emit a migration:
npm run migration:generate -- src/migrations/Baseline
# 3. Inspect the generated file. Remove anything destructive that's not intended.
# 4. Mark it as applied on the source DB so it doesn't try to re-create:
psql ... -c "INSERT INTO migrations(timestamp, name) VALUES (<ts>, 'Baseline<ts>');"
```

After this, the standard cycle:

```bash
# Edit an entity, then:
npm run migration:generate -- src/migrations/AddSomethingToDevices
# Inspect the SQL, commit it.
npm run migration:run        # applies pending migrations
npm run migration:revert     # rolls back the last one
npm run migration:show       # status of all migrations
```

## Rules

- **Always inspect the generated SQL before committing.** TypeORM occasionally
  emits surprising drops (column rename detected as drop+add).
- **One feature, one migration.** Easier review, easier rollback.
- **Migrations are append-only history.** Don't edit a committed migration —
  write a new one that fixes the previous.
- **`migrationsRun: true`** in app.module.ts means the next prod boot after
  deploy will apply any pending migration automatically. CI must run
  `migration:run --transaction=each` against a staging DB before promotion.
