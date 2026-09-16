"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BotaoSair({ classe }: { classe?: string }) {
  const router = useRouter();
  const [aSair, setASair] = useState(false);

  return (
    <button
      type="button"
      className={classe ?? "btn btn-contorno"}
      disabled={aSair}
      onClick={async () => {
        setASair(true);
        await fetch("/api/auth/sair", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      {aSair ? "A sair…" : "Terminar sessão"}
    </button>
  );
}
