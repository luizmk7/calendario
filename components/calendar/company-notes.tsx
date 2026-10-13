"use client";
import { useState } from "react";
import { LockKeyhole, MessageSquare, Plus, Check, Trash2 } from "lucide-react";
import type { Note, News } from "@/lib/portal-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function CompanyNotes({
  companyId,
  manager,
  notes,
  news,
  mutate,
  busy,
}: {
  companyId: string;
  manager: boolean;
  notes: Note[];
  news: News[];
  mutate: (body: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const [tab, setTab] = useState<"notes" | "news">(manager ? "notes" : "news");
  const [filter, setFilter] = useState("pending");
  const [editor, setEditor] = useState<{
    kind: "notes" | "news";
    id: string;
    body: string;
    date: string;
    resolved: boolean;
  } | null>(null);
  const source = tab === "notes" ? notes : news;
  const items = source.filter(
    (n) =>
      n.companyId === companyId &&
      (tab === "notes" || filter === "all" || (filter === "resolved" ? n.resolved : !n.resolved)),
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editor) return;
    const body =
      editor.kind === "notes"
        ? {
            action: "saveNote",
            note: {
              id: editor.id,
              companyId,
              body: editor.body,
              date: editor.date || null,
              resolved: editor.resolved,
            },
          }
        : {
            action: "sendNews",
            news: { companyId, body: editor.body, date: editor.date || null },
          };
    if (await mutate(body)) setEditor(null);
  }
  return (
    <section className="notes-area">
      <div className="notes-tabs">
        {manager && (
          <button
            aria-pressed={tab === "notes"}
            onClick={() => setTab("notes")}
          >
            <LockKeyhole size={16} />
            Suas notas internas
          </button>
        )}
        <button aria-pressed={tab === "news"} onClick={() => setTab("news")}>
          <MessageSquare size={16} />
          Novidades do cliente{" "}
          <span>
            {news.filter((n) => n.companyId === companyId && !n.readAt)
              .length || ""}
          </span>
        </button>
      </div>
      <div className="notes-heading">
        <div>
          <h2>
            {tab === "notes" ? "Seu espaço de ideias" : "Novidades e sugestões"}
          </h2>
          <p>
            {tab === "notes"
              ? "Guarde ideias e roteiros de vídeos. Visível somente para você."
              : "Promoções, lançamentos e eventos desta empresa."}
          </p>
        </div>
        {(tab === "notes" || !manager) && (
          <button
            className="primary-button"
            onClick={() =>
              setEditor({
                kind: tab,
                id: crypto.randomUUID(),
                body: "",
                date: "",
                resolved: false,
              })
            }
          >
            <Plus size={16} />
            {tab === "notes" ? "Nova nota" : "Enviar novidade"}
          </button>
        )}
      </div>
      {tab === "news" && (<div className="note-filters">
        {[
          ["pending", "Pendentes"],
          ["resolved", "Resolvidas"],
          ["all", "Todas"],
        ].map(([v, l]) => (
          <button
            aria-pressed={filter === v}
            onClick={() => setFilter(v)}
            key={v}
          >
            {l}
          </button>
        ))}
      </div>)}
      {!items.length ? (
        <div className="empty-day">
          <p>
            {tab === "notes"
              ? "Suas ideias e roteiros ficam aqui. Crie sua primeira nota."
              : "Nenhuma novidade neste filtro."}
          </p>
        </div>
      ) : (
        <div className="notes-grid">
          {items.map((n) => (
            <article className="note-card" key={n.id}>
              <div className="note-meta">
                <span>
                  {n.date
                    ? new Date(n.date + "T12:00:00").toLocaleDateString("pt-BR")
                    : "Sem data específica"}
                </span>
                {tab === "news" && (<span>
                  {n.resolved
                    ? "Resolvida"
                    : tab === "news" && !(n as News).readAt
                      ? "Nova"
                      : "Pendente"}
                </span>)}
              </div>
              <p className="note-body">{n.body}</p>
              <small>
                Registrada em{" "}
                {new Date(n.createdAt).toLocaleDateString("pt-BR", {
                  timeZone: "America/Bahia",
                })}
              </small>
              {manager && (
                <div className="note-actions">
                  {tab === "news" && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void mutate({
                          action: "updateNews",
                          id: n.id,
                          resolved: !n.resolved,
                          read: true,
                        })
                      }
                    >
                      <Check size={15} />
                      {n.resolved ? "Reabrir" : "Resolver"}
                    </button>
                  )}
                  {tab === "notes" ? (
                    <>
                      <button
                        disabled={busy}
                        onClick={() =>
                          setEditor({
                            kind: "notes",
                            id: n.id,
                            body: n.body,
                            date: n.date || "",
                            resolved: n.resolved,
                          })
                        }
                      >
                        Editar
                      </button>
                      <button
                        aria-label="Excluir nota"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("Excluir esta nota interna?"))
                            void mutate({ action: "deleteNote", id: n.id });
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  ) : (
                    !(n as News).readAt && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void mutate({
                            action: "updateNews",
                            id: n.id,
                            read: true,
                          })
                        }
                      >
                        Marcar como lida
                      </button>
                    )
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.kind === "notes"
                ? "Nota interna"
                : "Enviar novidade ou sugestão"}
            </DialogTitle>
            <DialogDescription>
              {editor?.kind === "notes"
                ? "Somente você pode consultar esta anotação."
                : "Seu gestor recebe a novidade e avalia como incluí-la no planejamento."}
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <form className="editor-form" onSubmit={save}>
              <label>
                {editor.kind === "notes" ? "Anotação" : "Sua novidade"}
                <textarea
                  required
                  maxLength={5000}
                  rows={editor.kind === "notes" ? 10 : 5}
                  value={editor.body}
                  onChange={(e) =>
                    setEditor({ ...editor, body: e.target.value })
                  }
                  placeholder={
                    editor.kind === "notes"
                      ? "Escreva sua ideia ou roteiro de vídeo…"
                      : "Sábado teremos música ao vivo…"
                  }
                />
              </label>
              <label>
                Data relacionada (opcional)
                <input
                  type="date"
                  value={editor.date}
                  onChange={(e) =>
                    setEditor({ ...editor, date: e.target.value })
                  }
                />
              </label>
              <button className="primary-button" disabled={busy}>
                {busy
                  ? "Salvando…"
                  : editor.kind === "notes"
                    ? "Salvar nota"
                    : "Enviar novidade"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
