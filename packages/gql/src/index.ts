import { createSchema, createYoga } from "graphql-yoga";
import { createServer } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createResolvers } from "./resolvers/index.js";
import { createClients } from "./clients/index.js";
import type { Context } from "./context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const typeDefs = readFileSync(join(__dirname, "schema.graphql"), "utf-8");
const servicesBaseUrl = process.env.SERVICES_URL ?? "http://localhost:4001";

const schema = createSchema<Context>({
  typeDefs,
  resolvers: createResolvers(),
});

const yoga = createYoga({
  schema,
  context: async ({ request }) => {
    const clients = createClients(servicesBaseUrl);
    const authorization = request.headers.get("authorization") ?? "";
    const prefix = "Bearer ";
    const token = authorization.startsWith(prefix)
      ? authorization.slice(prefix.length).trim()
      : "";

    let user = undefined;
    if (token) {
      const session = await clients.authService.validateSession({ token });
      if (session.valid && session.user) {
        user = session.user;
      }
    }

    return {
      servicesBaseUrl,
      clients,
      auth: {
        token,
        user,
        isAuthenticated: Boolean(user),
      },
    };
  },
});

const port = Number(process.env.PORT) || 4000;
createServer(yoga).listen(port, () => {
  console.log(`GQL listening on http://localhost:${port}/graphql`);
});
