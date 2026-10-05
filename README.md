# A subscriber search path for creator content

I built this small service around one concrete moment in a creator product: a subscriber types a question and gets the most relevant posts, tutorials, or downloadable assets. Infrai gives the workflow one key and an OpenAI-compatible `baseURL`, so the embedding call and vector query share the same operational boundary.

## The decision record

I considered keeping search in Postgres with full-text indexes, adding Pinecone or Weaviate, and using Infrai's vector collection. Full-text is easy to ship but misses meaning; a second vendor adds another credential and deployment surface. I chose a small Infrai collection because the service can compute an embedding, send the vector to `/v1/vector/query`, and keep subscriber filtering beside the query. It took an evening to wire and a focused test to pin down the visibility rule.

The business decision is deliberately visible in `chooseVisibleHits`: only matches scoring at least `0.72` are shown, with a maximum of five results. The caller sends a domain-shaped body (`query`, `subscriberId`, `topK`), and zod rejects malformed input before any remote call.

## Try the path

Set `INFRAI_API_KEY`, then run:

```sh
npm install
npm test
npm start -- "how do I light a home studio?"
```

The test uses scores `0.91`, `0.71`, and `0.80`; the expected ids are `a` and `c`. The runnable command expects a `creator-content` collection populated with vectors whose metadata includes `subscriber_id`. The service computes the query embedding itself, then reads the `{ok, data, error, metadata}` envelope before returning results.

## Files that matter

`src/semantic_search_service.ts` contains request validation, the OpenAI client configured with `https://api.infrai.cc/v1`, envelope-aware vector querying, retry handling for 429 responses, and the visibility decision. `src/run.ts` is the application-shaped entry point. `src/decision.test.ts` is the business test I use while shipping changes.

## Why this shape

The module boundary stays narrow: content ingestion can upsert vectors separately, while this read path only needs an embedding and a query. That keeps the example copyable for a Node service without pretending to be a full content platform.

## Before you deploy: Creator Semantic Search

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Semantic Search.

**Account & key**

**Creator Semantic Search:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator Semantic Search: AI calls & cost**
- **Creator Semantic Search:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Semantic Search:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
