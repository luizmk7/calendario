import { test } from "node:test";
import assert from "node:assert/strict";
import { portalAction } from "../lib/portal-validation";
import { totals, monthRange } from "../lib/portal-types";
const post = {
  id: "p",
  companyId: "vianzo",
  title: "",
  date: "2026-10-12",
  format: "Stories" as const,
  topic: "",
  quantity: 3,
  publishedQuantity: 2,
};
test("accepts planning without media, title, topic or fixed time", () => {
  assert.equal(
    portalAction.safeParse({ action: "savePost", post }).success,
    true,
  );
  assert.deepEqual(totals([post]), { planned: 3, published: 2 });
});
test("rejects impossible dates and quantities", () => {
  for (const update of [
    { date: "2026-02-30" },
    { quantity: 0 },
    { publishedQuantity: 4 },
    { quantity: 1.5 },
  ])
    assert.equal(
      portalAction.safeParse({
        action: "savePost",
        post: { ...post, ...update },
      }).success,
      false,
    );
});
test("calendar month uses correct leap year boundaries", () => {
  assert.equal(monthRange("2028-02").end, "2028-02-29");
  assert.equal(monthRange("2026-02").end, "2026-02-28");
});
test("client cannot inject owner or resolved fields into news", () => {
  const parsed = portalAction.parse({
    action: "sendNews",
    news: {
      companyId: "vianzo",
      body: "Promoção",
      date: null,
      owner_id: "foreign",
      resolved: true,
    },
  });
  assert.deepEqual(parsed, {
    action: "sendNews",
    news: { companyId: "vianzo", body: "Promoção", date: null },
  });
});
