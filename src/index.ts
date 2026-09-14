import { type APIInteraction, InteractionType, REST } from "discord.js"
import { GatewayDO } from "./gateway/GatewayDO"
import { ephemeralError } from "./respond"
import { routeInteraction } from "./router"
import { createSummarizer, deliverManualSummary, type ManualSummaryDeps, type ManualSummaryMessage } from "./summary"
import { verifyDiscordSignature } from "./verify"

export { GatewayDO }

async function handleInteractions(request: Request, env: Env, ctx: ExecutionContext) {
  const body = await request.text()
  if (
    !(await verifyDiscordSignature({
      publicKeyHex: env.DISCORD_PUBLIC_KEY,
      signatureHex: request.headers.get("X-Signature-Ed25519"),
      timestamp: request.headers.get("X-Signature-Timestamp"),
      body,
    }))
  ) {
    return new Response("Invalid signature", { status: 401 })
  }

  const interaction = JSON.parse(body) as APIInteraction
  if (interaction.type === InteractionType.Ping) {
    return Response.json({ type: 1 })
  }

  try {
    return Response.json(
      await routeInteraction(interaction, {
        env,
        rest: new REST({ version: "10" }).setToken(env.DISCORD_TOKEN),
        waitUntil: (promise) => ctx.waitUntil(promise),
      }),
    )
  } catch (error) {
    console.error("Interaction handling failed", error)
    return Response.json(ephemeralError("Si è verificato un errore durante l'esecuzione del comando."))
  }
}

export async function handleManualSummaryBatch(batch: MessageBatch<ManualSummaryMessage>, deps: ManualSummaryDeps) {
  for (const message of batch.messages) {
    try {
      await deliverManualSummary(deps, message.body)
      message.ack()
    } catch (error) {
      console.error(`Manual summary delivery failed for channel ${message.body.channelId}`, error)
      message.retry()
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url)
    if (pathname === "/health") {
      return new Response("ok")
    }
    if (pathname === "/interactions" && request.method === "POST") {
      return handleInteractions(request, env, ctx)
    }
    return new Response("Not Found", { status: 404 })
  },

  async scheduled(_controller: ScheduledController, env: Env) {
    const stub = env.GATEWAY.get(env.GATEWAY.idFromName("main"))
    await stub.fetch("https://gateway.internal/ensure")
    await stub.fetch("https://gateway.internal/summary-poll")
  },

  async queue(batch: MessageBatch<ManualSummaryMessage>, env: Env) {
    await handleManualSummaryBatch(batch, {
      rest: new REST({ version: "10" }).setToken(env.DISCORD_TOKEN),
      summarize: createSummarizer(env.AI),
      applicationId: env.DISCORD_APPLICATION_ID,
    })
  },
} satisfies ExportedHandler<Env, ManualSummaryMessage>
