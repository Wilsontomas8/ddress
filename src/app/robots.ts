import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // O painel e as rotas internas não devem ir parar aos motores de busca
      disallow: ["/admin", "/api", "/conta", "/checkout", "/pedido"],
    },
  };
}
