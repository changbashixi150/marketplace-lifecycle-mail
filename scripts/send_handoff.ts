import { lifecycleEvent, composeLifecycleMail } from "../src/lifecycle_mail.js";
import { sendMail } from "../src/infrai_mail.js";

const buyerEmail = process.env.DEMO_EMAIL_TO;
if (!buyerEmail) throw new Error("DEMO_EMAIL_TO is required");
const event = lifecycleEvent.parse({
  eventId: process.env.DEMO_EVENT_ID ?? crypto.randomUUID(),
  orderId: "MP-1042", product: "Vintage camera", sellerEmail: buyerEmail, buyerEmail,
  stage: "order_handoff", handoffNote: "Your tracking details are in your storefront account."
});
const messageId = await sendMail(composeLifecycleMail(event), event.eventId);
console.log(JSON.stringify({ orderId: event.orderId, stage: event.stage, message_id: messageId }));
