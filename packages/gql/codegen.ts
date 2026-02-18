import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "./src/schema.graphql",
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        contextType: "../context#Context",
        mapperTypeSuffix: "Model",
        mappers: {
          Driver: "@driver-onboarding/proto#Driver",
          AuditEvent: "@driver-onboarding/proto#AuditEvent",
          AdminUser: "@driver-onboarding/proto#AdminUser",
        },
      },
    },
  },
};

export default config;
