# WorkLane

WorkLane is a distributed workflow automation platform with webhook triggers, queued dispatching, and worker-executed integration steps.

## Architecture

- **Dashboard**: frontend for creating workflows and viewing runs.
- **Control Plane**: main API for auth, workflow definitions, and provider metadata.
- **Ingestion**: receives incoming webhook events and records workflow executions.
- **Dispatcher**: reads pending execution outbox rows and publishes Kafka messages.
- **Executor**: consumes Kafka messages and runs workflow steps in order.
- **Database**: PostgreSQL with Prisma.
- **Messaging**: Kafka.

## Monorepo Layout

```txt
apps/
  dashboard/

services/
  control-plane/
  ingestion/
  dispatcher/
  executor/

packages/
  db/
  shared/
```

## Core Domain Terms

- **Workflow**: an automation created by a user.
- **Trigger**: the event that starts a workflow.
- **Step**: one action inside a workflow.
- **Execution**: one run of a workflow.
- **ExecutionOutbox**: pending execution events waiting to be dispatched.

## Version 1 Providers

### Triggers

- `webhook.received`: starts a workflow when an HTTP webhook is received.

### Steps

- `log.message`: writes a message to executor logs.
- `email.send`: sends an email through SMTP.
- `http.request`: calls an external API.

## Database Package

The shared Prisma package lives in `packages/db`.

```txt
packages/db/
  prisma/
    schema.prisma
    seed.ts
  src/
    index.ts
```

Useful scripts:

```txt
npm run db:generate
npm run db:migrate
npm run db:seed
```
