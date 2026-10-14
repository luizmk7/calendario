"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  CalendarDays,
  Film,
  LayoutGrid,
  PanelTop,
} from "lucide-react";
import type { Company, PlanPost } from "@/lib/portal-types";
import { totals, todayInBahia } from "@/lib/portal-types";
const formats = ["Feed", "Stories", "Reels"] as const;
const icon = (f: string) =>
  f === "Feed" ? (
    <LayoutGrid size={16} />
  ) : f === "Reels" ? (
    <Film size={16} />
  ) : (
    <PanelTop size={16} />
  );
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function PlanningCalendar({
  company,
  posts,
  month,
  onMonth,
  manager,
  onEdit,
  onProgress,
  busy,
}: {
  company: Company;
  posts: PlanPost[];
  month: string;
  onMonth: (v: string) => void;
  manager: boolean;
  onEdit: (p: PlanPost) => void;
  onProgress: (p: PlanPost) => void;
  busy: boolean;
}) {
  const today = todayInBahia();
  const [selected, setSelected] = useState(
    today.startsWith(month) ? today : month + "-01",
  );
  const [view, setView] = useState<"month" | "week">("week");
  const [filter, setFilter] = useState("all");
  const active = selected.startsWith(month) ? selected : month + "-01";
  const first = new Date(month + "-01T12:00:00");
  const offset = (first.getDay() + 6) % 7;
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const monthly = Array.from(
    { length: Math.ceil((offset + last) / 7) * 7 },
    (_, i) =>
      iso(new Date(first.getFullYear(), first.getMonth(), i - offset + 1)),
  );
  const d = new Date(active + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const t = new Date(d);
    t.setDate(d.getDate() + i);
    return iso(t);
  });
  const own = posts.filter((p) => p.companyId === company.id);
  const monthlyPosts = own.filter((p) => p.date.startsWith(month));
  const summary = totals(monthlyPosts);
  const visible = own.filter(
    (p) =>
      filter === "all" ||
      (filter === "published"
        ? p.publishedQuantity === p.quantity
        : p.publishedQuantity < p.quantity),
  );
  const day = visible.filter((p) => p.date === active);
  function move(delta: number) {
    if (view === "week") {
      const x = new Date(active + "T12:00:00");
      x.setDate(x.getDate() + 7 * delta);
      setSelected(iso(x));
      onMonth(iso(x).slice(0, 7));
    } else {
      const x = new Date(first);
      x.setMonth(x.getMonth() + delta);
      const value = iso(x);
      onMonth(value.slice(0, 7));
      setSelected(value);
    }
  }
  function add(date = active) {
    onEdit({
      id: crypto.randomUUID(),
      companyId: company.id,
      title: "",
      date,
      format: "Stories",
      topic: "",
      quantity: 1,
      publishedQuantity: 0,
    });
  }
  return (
    <>
      <div className="portal-stats">
        <div>
          <span>Previstas no mês</span>
          <strong>{summary.planned}</strong>
        </div>
        <div>
          <span>Já publicadas</span>
          <strong>{summary.published}</strong>
          <small>
            {summary.planned
              ? Math.round((summary.published / summary.planned) * 100)
              : 0}
            % concluído
          </small>
        </div>
        <div>
          <span>A publicar</span>
          <strong>{summary.planned - summary.published}</strong>
        </div>
      </div>
      <section
        className="calendar-panel"
        aria-label="Calendário de planejamento"
      >
        <div className="calendar-toolbar">
          <div className="month-control">
            <button
              className="icon-button"
              aria-label="Período anterior"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={19} />
            </button>
            <h2>
              {first.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              className="icon-button"
              aria-label="Próximo período"
              onClick={() => move(1)}
            >
              <ChevronRight size={19} />
            </button>
            <button
              className="today-button"
              onClick={() => {
                setSelected(today);
                onMonth(today.slice(0, 7));
              }}
            >
              Hoje
            </button>
          </div>
          <div className="calendar-options">
            <select
              aria-label="Filtrar publicações"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="pending">A publicar</option>
              <option value="published">Publicadas</option>
            </select>
            <div className="segmented">
              <button
                aria-pressed={view === "week"}
                onClick={() => setView("week")}
              >
                Semana
              </button>
              <button
                aria-pressed={view === "month"}
                onClick={() => setView("month")}
              >
                Mês
              </button>
            </div>
          </div>
        </div>
        {view === "month" && (
          <>
            <div className="weekdays">
              {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {(view === "month" ? monthly : weekly).map((date) => {
                const list = visible.filter((p) => p.date === date);
                const count = totals(list);
                return (
                  <button
                    key={date}
                    className={`day ${date === active ? "selected" : ""} ${date === today ? "is-today" : ""} ${date.startsWith(month) ? "" : "outside"}`}
                    aria-pressed={date === active}
                    aria-label={`${date}, ${count.planned} publicações`}
                    onClick={() => {
                      setSelected(date);
                      if (!date.startsWith(month)) onMonth(date.slice(0, 7));
                    }}
                  >
                    <span className="day-number">{Number(date.slice(-2))}</span>
                    <div className="day-items">
                      {formats.map((f) => {
                        const t = totals(list.filter((p) => p.format === f));
                        return t.planned ? (
                          <div
                            className={`calendar-item ${f.toLowerCase()}`}
                            key={f}
                          >
                            {icon(f)}
                            <span>
                              {t.planned} {f}
                            </span>
                            {t.published === t.planned && <Check size={12} />}
                          </div>
                        ) : null;
                      })}
                    </div>
                    {count.planned > 0 && (
                      <span className="mobile-post-count">
                        {count.planned} posts
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {view === "week" && (
          <div className="week-picker" aria-label="Dias da semana">
            {weekly.map((date) => {
              const count = totals(own.filter((p) => p.date === date)).planned;
              const dateObject = new Date(date + "T12:00:00");
              return (
                <button
                  key={date}
                  className="week-day"
                  aria-pressed={date === active}
                  aria-current={date === today ? "date" : undefined}
                  aria-label={`${dateObject.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}, ${count} publicações${date === today ? ", hoje" : ""}`}
                  onClick={() => {
                    setSelected(date);
                    if (!date.startsWith(month)) onMonth(date.slice(0, 7));
                  }}
                >
                  <span className="week-day-name">
                    {dateObject
                      .toLocaleDateString("pt-BR", { weekday: "short" })
                      .replace(".", "")}
                  </span>
                  <span className="week-day-number">
                    {Number(date.slice(-2))}
                  </span>
                  <span
                    className={`week-day-dot ${count ? "has-posts" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>
      <section
        className="daily-section"
        key={active}
        aria-label="Publicações do dia selecionado"
      >
        <div className="daily-heading">
          <div>
            <p className="eyebrow">CONTEÚDOS DO DIA</p>
            <h2>
              {new Date(active + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
          </div>
          {manager && (
            <button
              className="primary-button quick-add"
              aria-label="Adicionar publicação"
              onClick={() => add()}
            >
              <Plus size={16} />
              <span>Adicionar publicação</span>
            </button>
          )}
        </div>
        {!day.length ? (
          <div className="empty-day">
            <CalendarDays size={28} />
            <p>
              Nenhuma publicação prevista
              {filter !== "all" ? " para este filtro" : ""}.
            </p>
          </div>
        ) : (
          <div className="plan-list">
            {day.map((p) => (
              <PlanItem
                key={p.id}
                post={p}
                manager={manager}
                busy={busy}
                onEdit={onEdit}
                onProgress={onProgress}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function PlanItem({
  post: p,
  manager,
  busy,
  onEdit,
  onProgress,
}: {
  post: PlanPost;
  manager: boolean;
  busy: boolean;
  onEdit: (p: PlanPost) => void;
  onProgress: (p: PlanPost) => void;
}) {
  return (
    <details className="plan-detail">
      <summary>
        <span className="plan-icon">{icon(p.format)}</span>
        <span className="plan-card-copy">
          <span className="plan-format">
            {p.quantity} {p.format}
          </span>
          <strong>
            {p.title && p.title !== p.format
              ? p.title
              : p.topic || "Tema a definir"}
          </strong>
        </span>
        <ChevronRight className="detail-chevron" size={17} />
      </summary>
      <div className="plan-expanded">
        {p.topic && p.title && p.title !== p.format && <p>{p.topic}</p>}
        <p className="publication-progress">
          {p.publishedQuantity} de {p.quantity} publicados
        </p>
        {manager && (
          <div className="plan-buttons">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => onProgress(p)}
            >
              {p.publishedQuantity === p.quantity
                ? "Desmarcar publicação"
                : p.quantity > 1
                  ? "+1 publicado"
                  : "Já publiquei"}
            </button>
            <button className="text-button" onClick={() => onEdit(p)}>
              Editar publicação
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
