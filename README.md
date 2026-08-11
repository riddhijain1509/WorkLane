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

## Control Plane API

The control-plane service lives in `services/control-plane` and runs on port `4000` by default.

Main endpoints:

```txt
GET  /health
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/providers/triggers
GET  /api/providers/steps
GET  /api/workflows
POST /api/workflows
GET  /api/workflows/:workflowId
GET  /api/workflows/:workflowId/executions
GET  /api/workflows/:workflowId/executions/:executionId
```

## Ingestion Service

The ingestion service lives in `services/ingestion` and runs on port `4001` by default.

Main endpoints:

```txt
GET  /health
POST /webhooks/:workflowId
```

When a webhook is received, ingestion creates a `WorkflowExecution`, queues each `ExecutionStep`, and writes the first pending `ExecutionOutbox` event for the dispatcher.

## Dispatcher Service

The dispatcher service lives in `services/dispatcher`.

It continuously polls pending `ExecutionOutbox` rows, publishes them to the Kafka topic configured by `KAFKA_TOPIC`, and marks each row as dispatched.

Useful script:

```txt
npm run dev:dispatcher
```

## Executor Service

The executor service lives in `services/executor`.

It consumes Kafka workflow events, runs the matching `ExecutionStep`, marks the step as succeeded or failed, and queues the next step through `ExecutionOutbox` when the workflow has more work.

Supported step providers:

```txt
log.message
email.send
http.request
```

Useful script:

```txt
npm run dev:executor
```

## Local Kafka

Kafka can be started locally with Docker Compose:

```txt
docker compose -f infra/docker-compose.yml up -d
```

The dispatcher and executor use:

```txt
KAFKA_BROKERS="localhost:9092"
KAFKA_TOPIC="workflow-events"
```
