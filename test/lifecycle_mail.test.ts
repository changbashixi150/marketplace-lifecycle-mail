import assert from "node:assert/strict";
import { test } from "node:test";
import { lifecycleEvent, composeLifecycleMail } from "../src/lifecycle_mail.js";

test("asset requests reach the seller while handoff reaches the buyer", () => {
  const common = { eventId: "123e4567-e89b-42d3-a456-426614174000", orderId: "MP-1042", product: "Vintage camera", sellerEmail: "seller@example.com", buyerEmail: "buyer@example.com" };
  const asset = composeLifecycleMail(lifecycleEvent.parse({ ...common, stage: "seller_asset", assetName: "Camera photos" }));
  const handoff = composeLifecycleMail(lifecycleEvent.parse({ ...common, stage: "order_handoff", handoffNote: "Tracking is ready." }));
  assert.equal(asset.to, "seller@example.com");
  assert.match(asset.text, /Camera photos/);
  assert.equal(handoff.to, "buyer@example.com");
  assert.match(handoff.text, /Tracking is ready/);
});
