const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.triggerProvider.upsert({
    where: { id: "webhook.received" },
    update: {},
    create: {
      id: "webhook.received",
      name: "Webhook",
      description: "Start a workflow when WorkLane receives an HTTP webhook.",
      iconUrl: "/providers/webhook.svg",
    },
  });

  await prisma.triggerProvider.upsert({
    where: { id: "manual.run" },
    update: {},
    create: {
      id: "manual.run",
      name: "Manual Run",
      description: "Start a workflow from the WorkLane dashboard.",
      iconUrl: "/providers/manual.svg",
    },
  });

  await prisma.stepProvider.upsert({
    where: { id: "log.message" },
    update: {},
    create: {
      id: "log.message",
      name: "Log Message",
      description: "Write a message to the executor logs. Useful for testing workflows.",
      iconUrl: "/providers/log.svg",
    },
  });

  await prisma.stepProvider.upsert({
    where: { id: "email.send" },
    update: {},
    create: {
      id: "email.send",
      name: "Send Email",
      description: "Send an email using configured SMTP credentials.",
      iconUrl: "/providers/email.svg",
    },
  });

  await prisma.stepProvider.upsert({
    where: { id: "http.request" },
    update: {},
    create: {
      id: "http.request",
      name: "HTTP Request",
      description: "Call an external API from a workflow step.",
      iconUrl: "/providers/http.svg",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
