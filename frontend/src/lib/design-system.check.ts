import assert from "node:assert";
import { extractTaskTags, resolveColorHex } from "./tags";
import { calculateProgress } from "./helpers/task-stats";

// Check tag extractor handles string and object labels
const tags1 = extractTaskTags({ tags: ["dev", "urgent"], labels: [{ name: "v1" }, "api"] });
assert.deepStrictEqual(tags1, ["dev", "urgent", "v1", "api"], "extractTaskTags should combine tags and labels");

// Check null/undefined safety
assert.deepStrictEqual(extractTaskTags(null), [], "null returns empty array");
assert.deepStrictEqual(extractTaskTags(undefined), [], "undefined returns empty array");

// Check color resolution
assert.strictEqual(resolveColorHex("red"), "#EF4444", "named color maps correctly");
assert.strictEqual(resolveColorHex("#123456"), "#123456", "hex passthrough");

// Check progress calculation
assert.strictEqual(calculateProgress(0, 0), 0, "0/0 returns 0");
assert.strictEqual(calculateProgress(1, 4), 25, "1/4 returns 25");

console.log("All self-checks passed!");
