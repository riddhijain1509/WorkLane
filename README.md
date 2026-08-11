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
