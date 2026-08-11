# WorkLane

WorkLane is a distributed workflow automation platform inspired by tools like Zapier, but built with a backend architecture that demonstrates real production concepts: workflow definitions, webhook ingestion, a transactional outbox, Kafka dispatching, scheduled runs, and worker-executed steps.

The project is intentionally built as a monorepo so each part of the system has a clear responsibility and can later be scaled or extended independently.

## Features

- User signup, login, logout, and session-based authentication.
- Workflow creation from a dashboard UI.
- Webhook, manual, and scheduled triggers.
- Step-based execution model.
- Execution history with per-step status.
- Transactional outbox pattern for reliable dispatching.
- Kafka-based communication between dispatcher and executor.
- SMTP email step support.
- HTTP request step support.
- Retro-styled landing page and dashboard UI.

## Screenshots and Demo

### Landing Page

![WorkLane demo](docs/assets/worklane-demo.gif)

### Workflow Dashboard

![WorkLane workflow dashboard](docs/assets/worklane-dashboard.png)

### Workflow Builder

![WorkLane workflow builder](docs/assets/worklane-builder.png)



## Architecture

```txt
Dashboard
   |
   v
Control Plane API  -----> PostgreSQL
   |                         ^
   |                         |
   v                         |
Ingestion Service -----> Execution Outbox
                             |
                             v
                         Dispatcher
                             |
                             v
                           Kafka
                             |
                             v
                          Executor
                             |
                             v
                    Execution Step Updates
```

### Main Services

- **Dashboard**: Next.js frontend for landing page, auth, workflow creation, and run monitoring.
- **Control Plane**: API for users, workflow definitions, providers, manual runs, and deletion.
- **Ingestion**: Receives webhook calls and creates workflow executions.
- **Scheduler**: Polls scheduled workflows and creates executions when they are due.
- **Dispatcher**: Reads pending outbox records and publishes execution events to Kafka.
- **Executor**: Consumes Kafka events and runs workflow steps in order.
- **Database**: PostgreSQL managed through Prisma.
- **Messaging**: Kafka running locally through Docker Compose.

## Monorepo Layout

```txt
apps/
  dashboard/              Next.js frontend

services/
  control-plane/          Auth, providers, workflows, manual runs
  ingestion/              Webhook entry point
  scheduler/              Scheduled trigger poller
  dispatcher/             Outbox to Kafka publisher
  executor/               Kafka consumer and step runner

packages/
  db/                     Prisma schema, migrations, seed data
  shared/                 Shared TypeScript types/helpers

infra/
  docker-compose.yml      Local Kafka setup
```

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL, Prisma
- **Messaging**: Kafka, KafkaJS
- **Email**: Nodemailer with SMTP
- **Local Infra**: Docker Compose

## Local Setup

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).

### 1. Install Dependencies

On Windows PowerShell, use `npm.cmd` if `npm` is blocked by execution policy.

```powershell
npm.cmd install
```

### 2. Create Environment File

Copy `.env.example` to `.env` and update values for your local machine.

```powershell
Copy-Item .env.example .env
```

Minimum required values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/worklane"
JWT_SECRET="replace-with-a-long-random-secret"

KAFKA_BROKERS="localhost:9092"
KAFKA_TOPIC="workflow-events"

CONTROL_PLANE_PORT="4000"
INGESTION_PORT="4001"

NEXT_PUBLIC_CONTROL_PLANE_URL="http://localhost:4000"
NEXT_PUBLIC_INGESTION_URL="http://localhost:4001"
```

Optional SMTP values for `email.send`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="WorkLane <your-email@gmail.com>"
```

Do not commit real SMTP credentials.

### 3. Set Up PostgreSQL

Create a local PostgreSQL database named `worklane`.

Example using `createdb`:

```powershell
createdb -h localhost -p 5432 -U postgres worklane
```

If `createdb` is not in your PATH on Windows, run it with the full PostgreSQL path:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h localhost -p 5432 -U postgres worklane
```

### 4. Generate, Migrate, and Seed Database

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
```

Seed data creates the first version of trigger and step providers.

### 5. Start Kafka

Docker Desktop must be running.

```powershell
docker compose -f infra/docker-compose.yml up -d
```

Check that Kafka is running:

```powershell
docker ps
```

### 6. Start Services

Open separate terminals for each service.

```powershell
npm.cmd run dev:control
npm.cmd run dev:ingestion
npm.cmd run dev:dispatcher
npm.cmd run dev:executor
npm.cmd run dev:scheduler
npm.cmd run dev:dashboard
```

Default local URLs:

```txt
Dashboard:      http://localhost:3000
Control Plane:  http://localhost:4000
Ingestion:      http://localhost:4001
Kafka:          localhost:9092
```

## Supported Triggers

### `webhook.received`

Starts a workflow when an HTTP request is sent to the workflow webhook URL.

Example:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:4001/webhooks/<workflow-id>" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"event":{"name":"Riddhi","source":"test"}}'
```

### `manual.run`

Starts a workflow from the dashboard by clicking the run button on a manual workflow.

### `schedule.interval`

Starts a workflow repeatedly based on `intervalSeconds` in the trigger config.

Example trigger config:

```json
{
  "intervalSeconds": 60
}
```

## Supported Steps

### `log.message`

Writes a configured message to the executor logs.

Example config:

```json
{
  "message": "Received event from {{event.source}}"
}
```

### `email.send`

Sends an email through the SMTP settings in `.env`.

Example config:

```json
{
  "to": "recipient@example.com",
  "subject": "WorkLane notification",
  "body": "A workflow was triggered by {{event.source}}."
}
```

### `http.request`

Calls an external API.

Example config:

```json
{
  "url": "https://example.com/api/events",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"name\":\"{{event.name}}\"}"
}
```

## API Reference

### Control Plane

```txt
GET    /health
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/providers/triggers
GET    /api/providers/steps
GET    /api/workflows
POST   /api/workflows
GET    /api/workflows/:workflowId
GET    /api/workflows/:workflowId/executions
GET    /api/workflows/:workflowId/executions/:executionId
POST   /api/workflows/:workflowId/manual-runs
DELETE /api/workflows/:workflowId
```

### Ingestion

```txt
GET  /health
POST /webhooks/:workflowId
```

## Testing the Happy Path

1. Start PostgreSQL and Kafka.
2. Start `control-plane`, `ingestion`, `dispatcher`, `executor`, and `dashboard`.
3. Create an account at `http://localhost:3000/signup`.
4. Create a workflow.
5. Choose a trigger:
   - Webhook: send a test webhook from the detail page.
   - Manual: click the run workflow button.
   - Schedule: wait for the scheduler interval.
6. Watch execution history update on the workflow detail page.
