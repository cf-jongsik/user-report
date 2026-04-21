import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    // TODO: Enforce Cloudflare Access / Zero Trust authentication here.
    // e.g. verify the CF-Access-JWT header to ensure only admins can view the reports.
    // if (!isValidAccessJWT(request)) return new Response("Unauthorized", { status: 401 });

    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
