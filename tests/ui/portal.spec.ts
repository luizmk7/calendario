import { test, expect, type Page } from "@playwright/test";
import { todayInBahia } from "../../lib/portal-types";
const today = todayInBahia();
async function fixture(page: Page, role: "manager" | "client") {
  const uid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    { alg: "HS256", typ: "JWT" },
    {
      sub: uid,
      exp,
      iat: exp - 3600,
      aud: "authenticated",
      role: "authenticated",
    },
    "fixture",
  ]
    .map((x, i) =>
      i === 2 ? x : Buffer.from(JSON.stringify(x)).toString("base64url"),
    )
    .join(".");
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.com",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = {
    access_token: token,
    refresh_token: "fixture",
    expires_in: 3600,
    expires_at: exp,
    token_type: "bearer",
    user,
  };
  await page.context().addCookies([
    {
      name: "sb-utkmkkmlvdanojnunmft-auth-token",
      value:
        "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  const data: any = {
    role,
    companies: [
      { id: "vianzo", name: "Vianzo", color: "#c78543" },
      ...(role === "manager"
        ? [{ id: "b", name: "Comércio B", color: "#527bd9" }]
        : []),
    ],
    posts: [
      {
        id: "p",
        companyId: "vianzo",
        title: "",
        date: today,
        format: "Stories",
        topic: "Produtos e ambiente",
        quantity: 3,
        publishedQuantity: 1,
      },
    ],
    notes:
      role === "manager"
        ? [
            {
              id: "11111111-1111-4111-8111-111111111111",
              companyId: "vianzo",
              body: "Gravar novo produto",
              date: null,
              resolved: false,
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
    news: [],
    clients: [],
  };
  await page.route("**/auth/v1/**", (r) =>
    r.fulfill({ json: { ...session, user } }),
  );
  await page.route("**/api/portal?**", async (route) => {
    if (route.request().method() === "POST") {
      const b = route.request().postDataJSON();
      if (b.action === "savePost") {
        const at = data.posts.findIndex((p: any) => p.id === b.post.id);
        if (at >= 0) data.posts[at] = b.post;
        else data.posts.push(b.post);
      }
      if (b.action === "saveNote") {
        const at = data.notes.findIndex((n: any) => n.id === b.note.id);
        const n = { ...b.note, createdAt: new Date().toISOString() };
        if (at >= 0) data.notes[at] = n;
        else data.notes.push(n);
      }
      if (b.action === "deleteNote")
        data.notes = data.notes.filter((n: any) => n.id !== b.id);
      if (b.action === "sendNews")
        data.news.push({
          ...b.news,
          id: "news",
          resolved: false,
          readAt: null,
          createdAt: new Date().toISOString(),
        });
    }
    await route.fulfill({ json: data });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: role === "manager" ? "Meu planejamento" : "Meu calendário",
    }),
  ).toBeVisible();
  return data;
}
test("manager plans quantities, records partial publication and keeps notes private", async ({
  page,
}) => {
  const data = await fixture(page, "manager");
  await expect(page.getByRole("button", {name: "Semana", exact: true})).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".segmented button").first()).toHaveText("Semana");
  await page.getByRole("button", {name: "Mês", exact: true}).click();
  await page.locator(".plan-detail summary").first().click();
  await page.getByRole("button", { name: "+1 publicado", exact: true }).click();
  await expect(page.getByText("2 de 3 publicados")).toBeVisible();
  await page
    .getByRole("button", { name: "Adicionar publicação", exact: true })
    .click();
  await page.getByLabel("Quantidade prevista").fill("4");
  await page.getByLabel("Tema (opcional)").fill("Novidades da semana");
  await page
    .getByRole("button", { name: "Salvar planejamento", exact: true })
    .click();
  await expect(
    page
      .locator(".plan-card-copy strong")
      .filter({ hasText: "Novidades da semana" }),
  ).toBeVisible();
  expect(data.posts.length).toBe(2);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/manager-calendar.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Anotações" }).click();
  await expect(page.getByText("Gravar novo produto")).toBeVisible();
  await page.getByRole("button", { name: "Nova ideia", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Anotação", exact: true })
    .fill("Ideia para a próxima visita");
  await page.getByRole("button", { name: "Salvar nota", exact: true }).click();
  await expect(page.getByText("Ideia para a próxima visita")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Pendentes|Resolvidas|Resolver|Reabrir/ }),
  ).toHaveCount(0);
  const note = page
    .locator(".note-card")
    .filter({ hasText: "Ideia para a próxima visita" });
  await note.getByRole("button", { name: "Abrir nota" }).click();
  await page.getByRole("button", { name: "Editar nota", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Anotação", exact: true })
    .fill("Roteiro atualizado\nCena 1: apresentar produto");
  await page.getByRole("button", { name: "Salvar nota", exact: true }).click();
  await expect(
    page.getByText("Roteiro atualizado", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/manager-notes.png",
    fullPage: true,
    animations: "disabled",
  });
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".note-card")
    .filter({ hasText: "Roteiro atualizado" })
    .getByRole("button", { name: "Apagar", exact: true })
    .click();
  await expect(
    page.getByText("Roteiro atualizado", { exact: false }),
  ).toHaveCount(0);
  await page.getByLabel("Selecionar empresa").selectOption("b");
  await expect(page.getByText("Ideia para a próxima visita")).toHaveCount(0);
});
test("client mobile view reads own calendar and sends a dated novelty", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const data = await fixture(page, "client");
  await expect(
    page.getByRole("button", { name: "Editar", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Acessos", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Comércio B")).toHaveCount(0);
  await expect(page.getByText("Gravar novo produto")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Semana", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".week-day")).toHaveCount(7);
  await expect(page.locator('.week-day[aria-pressed="true"]')).toHaveAttribute(
    "aria-current",
    "date",
  );
  const otherDay = page.locator('.week-day:not([aria-pressed="true"])').first();
  await otherDay.click();
  await expect(page.getByText("Nenhuma publicação prevista.")).toBeVisible();
  await page.getByRole("button", { name: "Hoje", exact: true }).click();
  await page.locator(".plan-detail summary").first().click();
  await expect(page.getByText("1 de 3 publicados")).toBeVisible();
  await page.getByRole("button", { name: "Mês", exact: true }).click();
  await expect(page.locator(".calendar-grid")).toBeVisible();
  await page.getByRole("button", { name: "Semana", exact: true }).click();
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Próximo período" }).click();
  await expect(
    page.getByRole("button", { name: "Semana", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Hoje", exact: true }).click();
  await expect(page.locator('.week-day[aria-pressed="true"]')).toHaveAttribute(
    "aria-current",
    "date",
  );
  await page.screenshot({
    path: "test-results/client-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Minhas mensagens", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enviar novidade", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await page.screenshot({
    path: "test-results/client-sheet.png",
    animations: "disabled",
  });
  const bounds = await sheet.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845);
  await page.getByLabel("Sua novidade").fill("Sábado teremos música ao vivo");
  await page.getByLabel("Data relacionada (opcional)").fill("2026-10-17");
  await page
    .getByRole("button", { name: "Enviar novidade", exact: true })
    .click();
  await expect(page.getByText("Sábado teremos música ao vivo")).toBeVisible();
  expect(data.news[0].companyId).toBe("vianzo");
  await expect(
    page.getByRole("button", { name: /Pendentes|Resolvidas|Resolver|Reabrir/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir mensagem" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Sábado teremos música ao vivo",
  );
});
test("real API rejects anonymous access", async ({ request }) => {
  const r = await request.get(`/api/portal?start=${today}&end=${today}`);
  expect(r.status()).toBe(401);
});
