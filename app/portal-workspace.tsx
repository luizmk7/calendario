"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  CalendarDays,
  Plus,
  Settings2,
  Loader2,
  RefreshCw,
  LogOut,
  LockKeyhole,
  MessageSquare,
  Users,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { browserClient } from "@/lib/supabase/client";
import type { Company, PlanPost, PortalData } from "@/lib/portal-types";
import { monthRange, todayInBahia } from "@/lib/portal-types";
import { PlanningCalendar } from "@/components/calendar/planning-calendar";
import { CompanyNotes } from "@/components/calendar/company-notes";
import { ClientAccessPanel } from "@/components/calendar/client-access";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
const LegacyWorkspace = dynamic(() => import("./workspace"));
const colors = [
  "#c78543",
  "#527bd9",
  "#b068ca",
  "#2b8b6a",
  "#db6275",
  "#3b9eab",
];
const initial: PortalData = {
  role: "unassigned",
  companies: [],
  posts: [],
  notes: [],
  news: [],
  clients: [],
};
function requestRange(month: string) {
  const { start, end } = monthRange(month);
  const a = new Date(start + "T12:00:00Z"),
    b = new Date(end + "T12:00:00Z");
  a.setUTCDate(a.getUTCDate() - 6);
  b.setUTCDate(b.getUTCDate() + 6);
  return `start=${a.toISOString().slice(0, 10)}&end=${b.toISOString().slice(0, 10)}`;
}
export default function PortalWorkspace() {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [legacy, setLegacy] = useState(false);
  const [month, setMonth] = useState(() => todayInBahia().slice(0, 7));
  const [selectedCompany, setSelectedCompany] = useState("");
  const [section, setSection] = useState("calendar");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<PlanPost | null>(null);
  const [companyEditor, setCompanyEditor] = useState<Company | null>(null);
  const sequence = useRef(0);
  const working = useRef(false);
  const manager = data.role === "manager";
  const company =
    data.companies.find((c) => c.id === selectedCompany) || data.companies[0];
  const load = useCallback(
    async (silent = false) => {
      if (working.current) return;
      const seq = ++sequence.current;
      if (!silent) setLoading(true);
      try {
        const r = await fetch("/api/portal?" + requestRange(month), {
          cache: "no-store",
        });
        const d = await r.json();
        if (seq !== sequence.current) return;
        if (r.status === 401) {
          await browserClient().auth.signOut();
          return;
        }
        if (d.code === "MIGRATION_REQUIRED") {
          setLegacy(true);
          return;
        }
        if (!r.ok) throw new Error(d.error || "Não foi possível carregar.");
        setData(d);
        setError("");
      } catch (e) {
        if (seq === sequence.current) setError((e as Error).message);
      } finally {
        if (seq === sequence.current) setLoading(false);
      }
    },
    [month],
  );
  useEffect(() => {
    void load(true);
    const update = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {
      sequence.current++;
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [load]);
  async function mutate(body: unknown) {
    if (working.current) return false;
    working.current = true;
    sequence.current++;
    setBusy(true);
    try {
      const r = await fetch("/api/portal?" + requestRange(month), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.status === 401) {
        await browserClient().auth.signOut();
        return false;
      }
      if (!r.ok) throw new Error(d.error || "Não foi possível salvar.");
      setData(d);
      setError("");
      toast.success("Alteração salva.");
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  function chooseCompany(id: string) {
    setSelectedCompany(id);
    setEditor(null);
    setCompanyEditor(null);
  }
  async function signOut() {
    const { error } = await browserClient().auth.signOut();
    if (error) toast.error("Não foi possível sair.");
  }
  if (legacy)
    return (
      <>
        <div className="migration-notice">
          Seu calendário continua disponível. Os novos painéis aguardam a
          atualização do banco.
        </div>
        <LegacyWorkspace />
      </>
    );
  return (
    <div className="portal-shell">
      <Toaster position="top-center" richColors />
      <header className="portal-header">
        <a href="/" className="portal-brand">
          <CalendarDays size={23} />
          <b>
            cauan<span>.</span>
          </b>
        </a>
        <span className="portal-role">
          {manager ? "Meu espaço de gestão" : "Meu planejamento"}
        </span>
        <button
          className="icon-button"
          aria-label="Sair"
          onClick={() => void signOut()}
        >
          <LogOut size={19} />
        </button>
      </header>
      <main className="portal-main" inert={busy}>
        <div className="portal-title">
          <div>
            <h1>{manager ? "Meu planejamento" : "Meu calendário"}</h1>
            <p>
              {manager
                ? "Uma visão clara de cada empresa, no seu ritmo."
                : "Acompanhe o que está previsto e o que já foi publicado."}
            </p>
          </div>
          <button
            className="text-button refresh-button"
            aria-label="Atualizar painel"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            <RefreshCw size={18} />
            <span>Atualizar</span>
          </button>
        </div>
        {error && (
          <div role="alert" className="portal-alert">
            {error}
            <button onClick={() => void load()}>Tentar novamente</button>
          </div>
        )}
        {loading ? (
          <div className="portal-loading">
            <Loader2 className="spin" />
            Carregando planejamento…
          </div>
        ) : data.role === "unassigned" ? (
          <div className="empty-company">
            <LockKeyhole size={32} />
            <h2>Seu acesso ainda não foi vinculado</h2>
            <p>
              Peça ao gestor para vincular seu e-mail à empresa. Depois,
              atualize esta página.
            </p>
          </div>
        ) : (
          <>
            {manager && (
              <div className="company-selector">
                <label>
                  Empresa
                  <select
                    aria-label="Selecionar empresa"
                    value={company?.id || ""}
                    onChange={(e) => chooseCompany(e.target.value)}
                  >
                    {!company && (
                      <option value="">Selecione uma empresa</option>
                    )}
                    {data.companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="text-button"
                  onClick={() =>
                    setCompanyEditor({
                      id: crypto.randomUUID(),
                      name: "",
                      color: colors[data.companies.length % colors.length],
                    })
                  }
                >
                  <Plus size={16} />
                  Adicionar empresa
                </button>
              </div>
            )}
            {!company ? (
              <div className="empty-company">
                <h2>Adicione sua primeira empresa</h2>
                <p>
                  Use o botão acima para começar a organizar o planejamento.
                </p>
              </div>
            ) : (
              <>
                <div className="portal-company-heading">
                  <span
                    className="company-avatar"
                    style={{
                      background: company.color + "20",
                      color: company.color,
                    }}
                  >
                    {company.name.slice(0, 1)}
                  </span>
                  <h2>{company.name}</h2>
                  {manager && (
                    <button
                      className="text-button company-setting"
                      aria-label="Editar empresa"
                      onClick={() => setCompanyEditor({ ...company })}
                    >
                      <Settings2 size={17} />
                      <span>Editar empresa</span>
                    </button>
                  )}
                  {manager && (
                    <button
                      className="text-button company-setting"
                      aria-pressed={section === "access"}
                      onClick={() =>
                        setSection(section === "access" ? "calendar" : "access")
                      }
                    >
                      <Users size={17} />
                      Acessos dos clientes
                    </button>
                  )}
                </div>
                <nav className="portal-nav" aria-label="Áreas da empresa">
                  <button
                    aria-current={section === "calendar" ? "page" : undefined}
                    onClick={() => setSection("calendar")}
                  >
                    <CalendarDays size={17} />
                    {manager ? "Calendário" : "Meu calendário"}
                  </button>
                  <button
                    aria-current={section === "notes" ? "page" : undefined}
                    onClick={() => setSection("notes")}
                  >
                    {manager ? (
                      <LockKeyhole size={17} />
                    ) : (
                      <MessageSquare size={17} />
                    )}{" "}
                    {manager ? "Anotações" : "Minhas mensagens"}
                  </button>
                </nav>
                {section === "calendar" && (
                  <PlanningCalendar
                    company={company}
                    posts={data.posts}
                    month={month}
                    onMonth={setMonth}
                    manager={manager}
                    onEdit={setEditor}
                    busy={busy}
                    onProgress={(p) =>
                      void mutate({
                        action: "savePost",
                        post: {
                          ...p,
                          publishedQuantity:
                            p.publishedQuantity === p.quantity
                              ? 0
                              : p.publishedQuantity + 1,
                        },
                      })
                    }
                  />
                )}
                {section === "notes" && (
                  <CompanyNotes
                    key={company.id}
                    companyId={company.id}
                    manager={manager}
                    notes={data.notes}
                    news={data.news}
                    mutate={mutate}
                    busy={busy}
                  />
                )}
                {section === "access" && manager && (
                  <ClientAccessPanel
                    key={company.id}
                    companyId={company.id}
                    clients={data.clients}
                    mutate={mutate}
                    busy={busy}
                  />
                )}
              </>
            )}
          </>
        )}
        <footer className="portal-footer">
          cauan. <span>Seu conteúdo, bem organizado.</span>
        </footer>
      </main>
      <Dialog
        open={!!editor && manager}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
      >
        <DialogContent className="portal-dialog">
          <DialogHeader>
            <DialogTitle>
              {data.posts.some((p) => p.id === editor?.id)
                ? "Editar planejamento"
                : "Novo planejamento"}
            </DialogTitle>
            <DialogDescription>
              Defina o formato e a quantidade. O tema pode ser escolhido depois.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <form
              className="editor-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await mutate({ action: "savePost", post: editor })) {
                  setMonth(editor.date.slice(0, 7));
                  setEditor(null);
                }
              }}
            >
              <div className="form-row">
                <label>
                  Data
                  <input
                    required
                    type="date"
                    value={editor.date}
                    onChange={(e) =>
                      setEditor({ ...editor, date: e.target.value })
                    }
                  />
                </label>
                <label>
                  Formato
                  <select
                    value={editor.format}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        format: e.target.value as PlanPost["format"],
                      })
                    }
                  >
                    {["Stories", "Feed", "Reels"].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Título (opcional)
                <input
                  maxLength={150}
                  value={editor.title}
                  onChange={(e) =>
                    setEditor({ ...editor, title: e.target.value })
                  }
                  placeholder="Ex.: Produto em destaque"
                />
              </label>
              {editor.internalNotes && (
                <div className="legacy-private-note">
                  <strong>Observações anteriores (privadas)</strong>
                  <p>{editor.internalNotes}</p>
                </div>
              )}
              <label>
                Tema (opcional)
                <input
                  maxLength={250}
                  value={editor.topic}
                  onChange={(e) =>
                    setEditor({ ...editor, topic: e.target.value })
                  }
                  placeholder="Pode ser definido na hora de postar"
                />
              </label>
              <div className="form-row">
                <label>
                  Quantidade prevista
                  <input
                    required
                    type="number"
                    min={1}
                    max={100}
                    value={editor.quantity}
                    onChange={(e) =>
                      setEditor({ ...editor, quantity: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Já publicadas
                  <input
                    required
                    type="number"
                    min={0}
                    max={editor.quantity}
                    value={editor.publishedQuantity}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        publishedQuantity: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              {editor.publishedQuantity > editor.quantity && (
                <p role="alert">
                  A quantidade publicada não pode superar a prevista.
                </p>
              )}
              <button
                className="primary-button"
                disabled={busy || editor.publishedQuantity > editor.quantity}
              >
                {busy ? "Salvando…" : "Salvar planejamento"}
              </button>
              {data.posts.some((p) => p.id === editor.id) && (
                <button
                  type="button"
                  className="danger-button"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      window.confirm("Excluir este planejamento?") &&
                      (await mutate({ action: "deletePost", id: editor.id }))
                    )
                      setEditor(null);
                  }}
                >
                  Excluir planejamento
                </button>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!companyEditor && manager}
        onOpenChange={(open) => {
          if (!open && !busy) setCompanyEditor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {data.companies.some((c) => c.id === companyEditor?.id)
                ? "Editar empresa"
                : "Nova empresa"}
            </DialogTitle>
            <DialogDescription>
              Nome e cor para identificar o calendário.
            </DialogDescription>
          </DialogHeader>
          {companyEditor && (
            <form
              className="editor-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await mutate({
                    action: "saveCompany",
                    company: companyEditor,
                  })
                ) {
                  setSelectedCompany(companyEditor.id);
                  setCompanyEditor(null);
                }
              }}
            >
              <label>
                Nome
                <input
                  required
                  maxLength={80}
                  value={companyEditor.name}
                  onChange={(e) =>
                    setCompanyEditor({ ...companyEditor, name: e.target.value })
                  }
                />
              </label>
              <fieldset>
                <legend>Cor</legend>
                <div className="color-picker">
                  {colors.map((c) => (
                    <button
                      type="button"
                      aria-label={`Cor ${c}`}
                      aria-pressed={companyEditor.color === c}
                      style={{ background: c }}
                      key={c}
                      onClick={() =>
                        setCompanyEditor({ ...companyEditor, color: c })
                      }
                    >
                      {companyEditor.color === c ? "✓" : ""}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button className="primary-button" disabled={busy}>
                {busy ? "Salvando…" : "Salvar empresa"}
              </button>
              {data.companies.some((c) => c.id === companyEditor.id) && (
                <button
                  className="danger-button"
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Excluir esta empresa, suas postagens, notas, novidades e acessos? Esta ação não pode ser desfeita.",
                      ) &&
                      (await mutate({
                        action: "deleteCompany",
                        id: companyEditor.id,
                      }))
                    ) {
                      setCompanyEditor(null);
                      setSelectedCompany("");
                    }
                  }}
                >
                  Excluir empresa
                </button>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
