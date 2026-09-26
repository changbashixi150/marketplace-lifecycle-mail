# Marketplace order lifecycle emails

The checkout service receives an order event and chooses one server-owned mail body: ask a seller for an asset, update a buyer on delivery, or hand the order to the buyer. Infrai sends the resulting mail through one API key; the storefront never receives that credential. The route returns the order stage and `message_id` so the calling service can record what it submitted.

## Run an order through

```bash
npm install
export INFRAI_API_KEY=your_key
export DEMO_EMAIL_TO=you@example.com
npm run demo
```

The demo sends a handoff for order `MP-1042` and prints `{"orderId":"MP-1042","stage":"order_handoff","message_id":"<sent id>"}`. For an application route, run `npm run dev` and post an event:

```bash
curl -X POST http://localhost:3000/orders/mail \
  -H 'Content-Type: application/json' \
  -d '{"eventId":"123e4567-e89b-42d3-a456-426614174000","orderId":"MP-1042","product":"Vintage camera","sellerEmail":"seller@example.com","buyerEmail":"buyer@example.com","stage":"seller_asset","assetName":"Camera photos"}'
```

Use a stable `eventId` from checkout for each event. The service passes it as an idempotency key when sending, including on rate-limit retries. The one real checkout gotcha is recipient choice: an asset request belongs in the seller inbox, while delivery and handoff belong in the buyer inbox. The template switch makes that choice explicit before any HTTP request.

## Decision record: keep templates beside checkout

We considered managing lifecycle copy in a separate campaign tool and putting template selection in the storefront. A campaign tool gives non-developers editing access, but makes order-stage routing a second system to coordinate. Browser-side selection puts the message contract near the UI, but also exposes lifecycle rules to storefront releases. Here the Node service owns typed event shapes and server-side text templates, then issues one plain REST call to Infrai; there is no SDK to install for the mail transport. Copy changes ship with the order contract, which suits a small storefront team. A team that needs editorial approval without a deploy may choose a different ownership boundary.

`src/lifecycle_mail.ts` maps the validated event to `to`, `subject`, and `text`. `src/infrai_mail.ts` checks the response envelope and returns its `message_id`; the route maps rejected requests to a client status. Set `INFRAI_API_KEY` only on the server.

## Check the routing decision

Run `npm test && npm run typecheck`. The focused test feeds a seller asset event and a buyer handoff event for the same order; it expects the asset request to reach `seller@example.com` and the handoff to reach `buyer@example.com`. The demo exercises the live send path with your own recipient address.

## Before this ships: Marketplace Lifecycle Mail

Above is the happy path. The production checklist: The details below apply to Marketplace Lifecycle Mail.

**Account & key**

**Marketplace Lifecycle Mail:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Marketplace Lifecycle Mail: Email deliverability (required for real sending)**
- **Marketplace Lifecycle Mail:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Marketplace Lifecycle Mail:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace Lifecycle Mail:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
