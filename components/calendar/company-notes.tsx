"use client";
import { useState } from "react";
import { LockKeyhole, MessageSquare, Plus, Trash2 } from "lucide-react";
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
  const [opened, setOpened] = useState<Note | null>(null);
  const [editor, setEditor] = useState<{
    kind: "notes" | "news";
    id: string;
    body: string;
    date: string;
    resolved: boolean;
  } | null>(null);
  const items = (tab === "notes" ? notes : news).filter(
    (n) => n.companyId === companyId,
  );
  const heading =
    tab === "notes"
      ? "Minhas notas"
      : manager
        ? "Mensagens do cliente"
        : "Minhas mensagens";
  function edit(n: Note) {
    setOpened(null);
    setEditor({
      kind: "notes",
      id: n.id,
      body: n.body,
      date: n.date || "",
      resolved: n.resolved,
    });
  }
  async function remove(n: Note) {
    if (
      window.confirm("Apagar esta nota?") &&
      (await mutate({ action: "deleteNote", id: n.id }))
    )
      setOpened(null);
  }
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
      {manager && (
        <div className="notes-tabs" aria-label="Tipo de anotação">
          <button
            aria-pressed={tab === "notes"}
            onClick={() => setTab("notes")}
          >
            <LockKeyhole size={16} />
            Minhas notas
          </button>
          <button aria-pressed={tab === "news"} onClick={() => setTab("news")}>
            <MessageSquare size={16} />
            Mensagens do cliente
          </button>
        </div>
      )}
      <div className="notes-heading">
        <div>
          <h2>{heading}</h2>
          <p>
            {tab === "notes"
              ? "Ideias e roteiros, só para você."
              : manager
                ? "Ideias e novidades enviadas por esta empresa."
                : "Compartilhe ideias, promoções e novidades com seu gestor."}
          </p>
        </div>
        {(tab === "notes" || !manager) && (
          <button
            className={manager ? "primary-button quick-add" : "primary-button message-compose-button"}
            aria-label={tab === "notes" ? "Nova ideia" : "Enviar novidade"}
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
            <span>{tab === "notes" ? "Nova ideia" : "Enviar novidade"}</span>
          </button>
        )}
      </div>
      {!items.length ? (
        <div className="empty-day">
          <p>
            {tab === "notes"
              ? "Uma ideia para o próximo vídeo? Guarde aqui."
              : "As mensagens desta empresa aparecerão aqui."}
          </p>
        </div>
      ) : (
        <div className="notes-grid">
          {items.map((n) => (
            <article className="note-card" key={n.id}>
              <div className="note-meta">
                <span>
                  {new Date(n.createdAt).toLocaleDateString("pt-BR", {
                    timeZone: "America/Bahia",
                  })}
                </span>
                {n.date && (
                  <span>
                    Para{" "}
                    {new Date(n.date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <p className="note-body note-preview">{n.body}</p>
              <div className="note-actions">
                <button onClick={() => setOpened(n)}>
                  Abrir {tab === "notes" ? "nota" : "mensagem"}
                </button>
                {manager && tab === "notes" && (
                  <>
                    <button disabled={busy} onClick={() => edit(n)}>
                      Editar
                    </button>
                    <button disabled={busy} onClick={() => void remove(n)}>
                      <Trash2 size={15} />
                      Apagar
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={!!opened || !!editor}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setOpened(null);
            setEditor(null);
          }
        }}
      >
        <DialogContent className="portal-dialog notebook-dialog">
          {editor ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {editor?.kind === "notes"
                    ? "Ideia ou roteiro"
                    : "Enviar novidade"}
                </DialogTitle>
                <DialogDescription>
                  {editor?.kind === "notes"
                    ? "Escreva no seu ritmo. Só você tem acesso."
                    : "Compartilhe com seu gestor o que está acontecendo na empresa."}
                </DialogDescription>
              </DialogHeader>
              {editor && (
                <form className="editor-form" onSubmit={save}>
                  <label>
                    {editor.kind === "notes" ? "Anotação" : "Sua novidade"}
                    <textarea
                      required
                      maxLength={5000}
                      rows={10}
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
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {tab === "notes"
                    ? "Minha nota"
                    : manager
                      ? "Mensagem do cliente"
                      : "Minha mensagem"}
                </DialogTitle>
                <DialogDescription>
                  {tab === "notes"
                    ? "Este texto é privado."
                    : "Ideias e novidades para o planejamento."}
                </DialogDescription>
              </DialogHeader>
              <p className="note-body">{opened?.body}</p>
              {manager && tab === "notes" && opened && (
                <div className="note-actions">
                  <button disabled={busy} onClick={() => edit(opened)}>
                    Editar nota
                  </button>
                  <button disabled={busy} onClick={() => void remove(opened)}>
                    <Trash2 size={15} />
                    Apagar nota
                  </button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
