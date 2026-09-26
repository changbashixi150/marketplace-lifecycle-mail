import { z } from "zod";

const shared = { eventId: z.string().uuid(), orderId: z.string().min(1), product: z.string().min(1), sellerEmail: z.string().email(), buyerEmail: z.string().email() };
export const lifecycleEvent = z.discriminatedUnion("stage", [
  z.object({ ...shared, stage: z.literal("seller_asset"), assetName: z.string().min(1) }),
  z.object({ ...shared, stage: z.literal("buyer_update"), deliveryDate: z.string().min(1) }),
  z.object({ ...shared, stage: z.literal("order_handoff"), handoffNote: z.string().min(1) })
]);
export type LifecycleEvent = z.infer<typeof lifecycleEvent>;

export function composeLifecycleMail(event: LifecycleEvent) {
  const order = `Order ${event.orderId} (${event.product})`;
  switch (event.stage) {
    case "seller_asset":
      return { to: event.sellerEmail, subject: `${order}: prepare your asset`, text: `Please prepare ${event.assetName} for ${order}. The buyer will receive an update after handoff.` };
    case "buyer_update":
      return { to: event.buyerEmail, subject: `${order}: delivery update`, text: `Your order is moving forward. Expected delivery: ${event.deliveryDate}.` };
    case "order_handoff":
      return { to: event.buyerEmail, subject: `${order}: seller handoff`, text: `The seller handed over your order. ${event.handoffNote}` };
  }
}
