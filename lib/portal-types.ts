export type Company = { id: string; name: string; color: string };
export type PlanPost = {
  id: string;
  companyId: string;
  title: string;
  date: string;
  format: "Feed" | "Stories" | "Reels";
  topic: string;
  quantity: number;
  publishedQuantity: number;
  internalNotes?: string;
};
export type Note = {
  id: string;
  companyId: string;
  body: string;
  date: string | null;
  resolved: boolean;
  createdAt: string;
};
export type News = Note & { readAt: string | null };
export type ClientAccess = {
  clientId: string;
  companyId: string;
  email: string;
};
export type PortalData = {
  role: "manager" | "client" | "unassigned";
  companies: Company[];
  posts: PlanPost[];
  notes: Note[];
  news: News[];
  clients: ClientAccess[];
};
export function todayInBahia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function monthRange(month: string) {
  const d = new Date(`${month}-01T12:00:00Z`);
  return {
    start: `${month}-01`,
    end: `${month}-${new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()}`,
  };
}
export function totals(posts: PlanPost[]) {
  return posts.reduce(
    (a, p) => ({
      planned: a.planned + p.quantity,
      published: a.published + p.publishedQuantity,
    }),
    { planned: 0, published: 0 },
  );
}
