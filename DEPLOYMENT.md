# Deployment Guide

This guide explains how to deploy WorkLane as a multi-service application.

WorkLane is not a single web app. It needs:

- A Next.js dashboard.
- Two public API services.
- Three background workers.
- PostgreSQL.
- Kafka.

## Recommended Hosting Setup

Use:

- **Render** for the dashboard, APIs, workers, and PostgreSQL.
- **Aiven Kafka** or another managed Kafka provider for Kafka.

## Services to Create

Create these services from the same GitHub repository.

```txt
dashboard       Web service
control-plane   Web service
ingestion       Web service
dispatcher      Background worker
executor        Background worker
scheduler       Background worker
postgres        Managed PostgreSQL
kafka           Managed Kafka
```

## Shared Environment Variables

Use these for every backend service and worker:

```env
DATABASE_URL="your-managed-postgres-url"
KAFKA_BROKERS="host:port"
KAFKA_TOPIC="workflow-events"
KAFKA_SSL="true"
KAFKA_USERNAME="your-kafka-username"
KAFKA_PASSWORD="your-kafka-password"
KAFKA_SASL_MECHANISM="plain"
KAFKA_CA_CERT="-----BEGIN CERTIFICATE-----..."
```

For local Docker Kafka, keep:

```env
KAFKA_BROKERS="localhost:9092"
KAFKA_SSL="false"
KAFKA_USERNAME=""
KAFKA_PASSWORD=""
```

## Dashboard Service

Render service type: **Web Service**

Build command:

```bash
npm install && npm --workspace apps/dashboard run build
```

Start command:

```bash
npm --workspace apps/dashboard run start -- -p $PORT
```

Environment variables:

```env
NEXT_PUBLIC_CONTROL_PLANE_URL="https://your-control-plane-url"
NEXT_PUBLIC_INGESTION_URL="https://your-ingestion-url"
```

## Control Plane Service

Render service type: **Web Service**

Build command:

```bash
npm install && npm run db:generate && npm --workspace packages/db run build && npm run db:deploy && npm --workspace services/control-plane run build
```

Pre-deploy command:

```bash
npm run db:deploy
```

Start command:

```bash
npm --workspace services/control-plane run start
```

Environment variables:

```env
DATABASE_URL="your-managed-postgres-url"
JWT_SECRET="a-long-random-production-secret"
DASHBOARD_ORIGIN="https://your-dashboard-url"
WORKER_HOST_URL="https://worklane-worker-host.onrender.com"
```

`WORKER_HOST_URL` lets manual runs wake the free-tier worker host when Render has put it to sleep.

## Ingestion Service

Render service type: **Web Service**

Build command:

```bash
npm install && npm run db:generate && npm --workspace packages/db run build && npm --workspace services/ingestion run build
```

Start command:

```bash
npm --workspace services/ingestion run start
```

Environment variables:

```env
DATABASE_URL="your-managed-postgres-url"
WORKER_HOST_URL="https://worklane-worker-host.onrender.com"
```

`WORKER_HOST_URL` lets webhook runs wake the free-tier worker host when Render has put it to sleep.

## Dispatcher Worker

Render service type: **Background Worker**

Render background workers do not have a free tier. For a free demo deployment, skip the separate dispatcher, executor, and scheduler worker services and use the [Free Tier Worker Host](#free-tier-worker-host) section instead.

Build command:

```bash
npm install && npm run db:generate && npm --workspace services/dispatcher run build
```

Start command:

```bash
npm --workspace services/dispatcher run start
```

Environment variables:

```env
DATABASE_URL="your-managed-postgres-url"
KAFKA_BROKERS="host:port"
KAFKA_TOPIC="workflow-events"
KAFKA_SSL="true"
KAFKA_USERNAME="your-kafka-username"
KAFKA_PASSWORD="your-kafka-password"
KAFKA_SASL_MECHANISM="plain"
KAFKA_CA_CERT="your-aiven-ca-certificate"
DISPATCHER_POLL_INTERVAL_MS="3000"
DISPATCHER_BATCH_SIZE="10"
```

## Executor Worker

Render service type: **Background Worker**

Build command:

```bash
npm install && npm run db:generate && npm --workspace services/executor run build
```

Start command:

```bash
npm --workspace services/executor run start
```

Environment variables:

```env
DATABASE_URL="your-managed-postgres-url"
KAFKA_BROKERS="host:port"
KAFKA_TOPIC="workflow-events"
KAFKA_SSL="true"
KAFKA_USERNAME="your-kafka-username"
KAFKA_PASSWORD="your-kafka-password"
KAFKA_SASL_MECHANISM="plain"
KAFKA_CA_CERT="your-aiven-ca-certificate"
EXECUTOR_GROUP_ID="worklane-executor"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_TIMEOUT_MS="15000"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="WorkLane <your-email@gmail.com>"
```

SMTP is optional unless you want `email.send` to work in production.

## Scheduler Worker

Render service type: **Background Worker**

Build command:

```bash
npm install && npm run db:generate && npm --workspace services/scheduler run build
```

Start command:

```bash
npm --workspace services/scheduler run start
```

Environment variables:

```env
DATABASE_URL="your-managed-postgres-url"
SCHEDULER_POLL_INTERVAL_MS="5000"
```

## Free Tier Worker Host

If you do not want to pay for Render background workers, deploy one normal Render **Web Service** that runs all three worker processes and exposes a small `/health` endpoint.

Render service type: **Web Service**

Name:

```txt
worklane-worker-host
```

Build command:

```bash
npm install && npm run db:generate && npm --workspace packages/db run build && npm --workspace services/dispatcher run build && npm --workspace services/executor run build && npm --workspace services/scheduler run build && npm --workspace services/worker-host run build
```

Start command:

```bash
npm --workspace services/worker-host run start
```

Environment variables:

```env
DATABASE_URL="your-managed-postgres-url"
KAFKA_BROKERS="host:port"
KAFKA_TOPIC="workflow-events"
KAFKA_SSL="true"
KAFKA_USERNAME="your-kafka-username"
KAFKA_PASSWORD="your-kafka-password"
KAFKA_SASL_MECHANISM="plain"
KAFKA_CA_CERT="your-aiven-ca-certificate"
EXECUTOR_GROUP_ID="worklane-executor"
DISPATCHER_POLL_INTERVAL_MS="3000"
DISPATCHER_BATCH_SIZE="10"
SCHEDULER_POLL_INTERVAL_MS="5000"
```

Optional SMTP variables for `email.send`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_TIMEOUT_MS="15000"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="WorkLane <your-email@gmail.com>"
```

Health check:

```txt
https://worklane-worker-host.onrender.com/health
```

Important limitation: Render free web services can sleep when inactive. When this service is asleep, workflow executions will not be processed until it wakes up again.

## Kafka Topic

Create this topic in your managed Kafka provider:

```txt
workflow-events
```

The dispatcher also attempts to create the topic on startup. For managed Kafka, it is still better to create it manually so permissions are explicit.

## Database Setup

Run migrations in production with:

```bash
npm run db:deploy
```

Run seed once after the first deploy if your database has no providers:

```bash
npm run db:seed
```

Do not run `prisma migrate dev` in production.

## Deployment Order

1. Create PostgreSQL.
2. Create Kafka and the `workflow-events` topic.
3. Deploy control-plane and run migrations.
4. Run seed once.
5. Deploy ingestion.
6. Deploy dispatcher.
7. Deploy executor.
8. Deploy scheduler.
9. Deploy dashboard with the public API URLs.

## Smoke Test

After deployment:

1. Open the dashboard URL.
2. Sign up.
3. Create a manual workflow with a `log.message` step.
4. Run it from the workflow detail page.
5. Confirm execution history shows a succeeded run.
6. Create a webhook workflow.
7. Send a POST request to the deployed ingestion webhook URL.
8. Confirm execution history updates.
