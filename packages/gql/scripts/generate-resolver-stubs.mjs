/**
 * Generates one resolver file per GraphQL object type with typed stubs.
 * Only creates a file if it doesn't exist (preserves your field resolution logic).
 * Run after main codegen: yarn codegen && node scripts/generate-resolver-stubs.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parse, visit } from "graphql";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "../src/schema.graphql");
const resolversDir = join(__dirname, "../src/resolvers");
const schema = readFileSync(schemaPath, "utf-8");
const ast = parse(schema);
const objectTypes = [];

visit(ast, {
  ObjectTypeDefinition(node) {
    if (node.name.value === "Query" || node.name.value === "Mutation") {
      return;
    }
    if (node.name.value.startsWith("__")) return;
    objectTypes.push({ name: node.name.value, fields: node.fields ?? [] });
  },
});

const stubByType = {
  Query: `import type { Resolvers } from "../generated/graphql.js";

export const Query: Resolvers["Query"] = {
  driver: async () => null,
  drivers: async () => ({ drivers: [], nextPageToken: null }),
  driversByFilters: async () => ({ drivers: [], nextPageToken: null }),
  stats: async () => ({ byStatus: [], total: 0 }),
};
`,
  Driver: `import type { Resolvers } from "../generated/graphql.js";

export const Driver: Resolvers["Driver"] = {};
`,
  DriversConnection: `import type { Resolvers } from "../generated/graphql.js";

export const DriversConnection: Resolvers["DriversConnection"] = {};
`,
  DriverStats: `import type { Resolvers } from "../generated/graphql.js";

export const DriverStats: Resolvers["DriverStats"] = {};
`,
  DriverStatusCount: `import type { Resolvers } from "../generated/graphql.js";

export const DriverStatusCount: Resolvers["DriverStatusCount"] = {};
`,
};

function defaultStub(name) {
  return `import type { Resolvers } from "../generated/graphql.js";

export const ${name}: Resolvers["${name}"] = {};
`;
}

if (!existsSync(resolversDir)) mkdirSync(resolversDir, { recursive: true });

for (const { name } of objectTypes) {
  const filePath = join(resolversDir, `${name}.ts`);
  if (existsSync(filePath)) continue;
  const stub = stubByType[name] ?? defaultStub(name);
  writeFileSync(filePath, stub, "utf-8");
  console.log("Created stub:", filePath);
}
