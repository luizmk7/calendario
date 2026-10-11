"use client";
import { useState } from "react";
import type { ClientAccess } from "@/lib/portal-types";
export function ClientAccessPanel({
  companyId,
  clients,
  mutate,
  busy,
}: {
  companyId: string;
  clients: ClientAccess[];
  mutate: (body: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const [email, setEmail] = useState("");
  return (
    <section className="access-panel">
      <h2>Acesso do cliente</h2>
      <p>
        Vincule o e-mail à empresa. O cliente consulta o calendário e envia
        novidades pelo mesmo endereço do sistema.
      </p>
      <form
        className="access-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await mutate({ action: "linkClient", email, companyId }))
            setEmail("");
        }}
      >
        <label>
          E-mail do cliente
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@empresa.com"
          />
        </label>
        <button className="primary-button" disabled={busy}>
          Vincular acesso
        </button>
      </form>
      <p className="access-help">
        Primeiro, crie a conta com e-mail confirmado em Supabase →
        Authentication → Users. Use uma conta exclusiva para o cliente. Ele
        entra com esse e-mail e a senha cadastrada.
      </p>
      {clients
        .filter((c) => c.companyId === companyId)
        .map((c) => (
          <div className="access-row" key={c.clientId}>
            <span>{c.email}</span>
            <button
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Remover o acesso de ${c.email}?`))
                  void mutate({ action: "revokeClient", clientId: c.clientId });
              }}
            >
              Remover acesso
            </button>
          </div>
        ))}
    </section>
  );
}
