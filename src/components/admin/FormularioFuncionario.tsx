"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarFuncionario } from "@/app/admin/acoes";

type Conta = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "CLIENTE" | "FUNCIONARIO" | "ADMIN";
  active: boolean;
};

export default function FormularioFuncionario({ conta }: { conta?: Conta }) {
  const router = useRouter();
  const [aProcessar, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [aberto, setAberto] = useState(!conta);

  if (conta && !aberto) {
    return (
      <button
        type="button"
        className="text-xs text-vinho hover:underline"
        onClick={() => setAberto(true)}
      >
        Editar
      </button>
    );
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-6"
      action={(fd) => {
        setAviso(null);
        iniciar(async () => {
          const r = await guardarFuncionario(fd);
          setAviso(
            r.ok
              ? { tipo: "ok", texto: r.mensagem ?? "Guardado." }
              : { tipo: "erro", texto: r.erro }
          );
          if (r.ok) {
            if (conta) setAberto(false);
            router.refresh();
          }
        });
      }}
    >
      {conta && <input type="hidden" name="id" value={conta.id} />}

      <label className="sm:col-span-2">
        <span className="etiqueta">Nome</span>
        <input className="campo" name="name" required defaultValue={conta?.name} />
      </label>
      <label className="sm:col-span-2">
        <span className="etiqueta">E-mail</span>
        <input type="email" className="campo" name="email" required defaultValue={conta?.email} />
      </label>
      <label>
        <span className="etiqueta">Telefone</span>
        <input className="campo" name="phone" defaultValue={conta?.phone ?? ""} />
      </label>
      <label>
        <span className="etiqueta">Papel</span>
        <select className="campo" name="role" defaultValue={conta?.role ?? "FUNCIONARIO"}>
          <option value="FUNCIONARIO">Funcionário</option>
          <option value="ADMIN">Administrador</option>
          <option value="CLIENTE">Cliente</option>
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="etiqueta">
          {conta ? "Nova palavra-passe (deixe vazio para manter)" : "Palavra-passe"}
        </span>
        <input
          type="password"
          className="campo"
          name="password"
          minLength={conta ? 0 : 6}
          required={!conta}
          autoComplete="new-password"
        />
      </label>

      {conta && (
        <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-2">
          <input type="checkbox" name="active" value="sim" defaultChecked={conta.active} />
          <span>Conta ativa</span>
          <input type="hidden" name="active" value="nao" />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button type="submit" className="btn btn-principal" disabled={aProcessar}>
          {conta ? "Guardar" : "Criar conta"}
        </button>
        {conta && (
          <button type="button" className="btn btn-contorno" onClick={() => setAberto(false)}>
            Cancelar
          </button>
        )}
        {aviso && (
          <span className={aviso.tipo === "ok" ? "text-sm text-verde" : "text-sm text-vinho"}>
            {aviso.texto}
          </span>
        )}
      </div>
    </form>
  );
}
