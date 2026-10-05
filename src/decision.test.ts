import assert from "node:assert/strict";
import { chooseVisibleHits, parseSearchRequest } from "./semantic_search_service.ts";

const parsed = parseSearchRequest({ query: "lighting", subscriberId: "sub-1" });
assert.equal(parsed.topK, 5);
const visible = chooseVisibleHits([
  { id: "a", score: 0.91 },
  { id: "b", score: 0.71 },
  { id: "c", score: 0.8 }
]);
assert.deepEqual(visible.map((hit) => hit.id), ["a", "c"]);
console.log("decision test passed");
