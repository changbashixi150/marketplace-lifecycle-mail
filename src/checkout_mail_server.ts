import { createServer } from "node:http";
import { ZodError } from "zod";
import { lifecycleEvent, composeLifecycleMail } from "./lifecycle_mail.js";
import { MailError, sendMail } from "./infrai_mail.js";

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/orders/mail") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }
  try {
    let raw = "";
    for await (const chunk of request) {
      raw += chunk;
      if (raw.length > 16_384) { response.writeHead(413).end(JSON.stringify({ error: "Request too large" })); return; }
    }
    const event = lifecycleEvent.parse(JSON.parse(raw));
    const messageId = await sendMail(composeLifecycleMail(event), event.eventId);
    response.writeHead(200).end(JSON.stringify({ orderId: event.orderId, stage: event.stage, message_id: messageId }));
  } catch (error) {
    const status = error instanceof ZodError || error instanceof SyntaxError ? 400 : error instanceof MailError ? (error.status >= 400 && error.status < 500 ? error.status : 502) : 502;
    response.writeHead(status).end(JSON.stringify({ error: error instanceof MailError ? error.code : status === 400 ? "Invalid order event" : "Email delivery failed" }));
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => console.log(`Order mail listening on ${process.env.PORT ?? 3000}`));
