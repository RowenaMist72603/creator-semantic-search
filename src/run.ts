import { searchCreatorContent, chooseVisibleHits } from "./semantic_search_service.ts";

const query = process.argv[2] ?? "new studio lighting tutorial";
const subscriberId = process.env.SUBSCRIBER_ID ?? "demo-subscriber";
const hits = await searchCreatorContent({ query, subscriberId, topK: 5 });
console.log(JSON.stringify({ query, subscriberId, results: chooseVisibleHits(hits) }, null, 2));
