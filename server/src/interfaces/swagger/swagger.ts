import swaggerJSDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import type { Express } from "express";
import { env } from "../../config/env";

const definition: swaggerJSDoc.OAS3Definition = {
  openapi: "3.0.0",
  info: {
    title: "deplo.ai API",
    version: "1.0.0",
    description:
      "REST fallback + health endpoints for deplo.ai. Primary API surface is GraphQL at /graphql.",
    contact: { name: "deplo.ai", url: "https://deplo.ai.taj.works" },
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}/api/${env.API_VERSION}`,
      description: "Local development",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["healthy", "degraded"] },
          version: { type: "string" },
          environment: { type: "string" },
          checks: {
            type: "object",
            properties: {
              database: { type: "string" },
              redis: { type: "string" },
            },
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: "Health", description: "Health and readiness checks" },
    { name: "Auth", description: "GitHub OAuth authentication" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns service health including database and Redis status",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
          "503": {
            description: "Service degraded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/auth/github": {
      get: {
        tags: ["Auth"],
        summary: "Initiate GitHub OAuth flow",
        description: "Redirects the browser to GitHub OAuth authorization page",
        responses: {
          "302": { description: "Redirect to GitHub" },
        },
      },
    },
    "/auth/github/callback": {
      get: {
        tags: ["Auth"],
        summary: "GitHub OAuth callback",
        description: "Handles the OAuth code exchange and redirects to the client with a JWT token",
        parameters: [
          {
            name: "code",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "302": { description: "Redirect to client with token" },
          "400": {
            description: "Missing code",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user from token",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user info",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    userId: { type: "string" },
                    email: { type: "string" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Mounts Swagger UI at /docs. Returns true if mounted.
 *
 * Disabled in production: the docs page is unauthenticated, so exposing the
 * API surface publicly is avoided in prod. Available in development/test only.
 */
export function setupSwagger(app: Express): boolean {
  if (env.NODE_ENV === "production") {
    return false;
  }

  const spec = swaggerJSDoc({ definition, apis: [] });

  app.use(
    "/docs",
    swaggerUI.serve,
    swaggerUI.setup(spec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "deplo.ai API Docs",
      swaggerOptions: {
        docExpansion: "list",
        filter: true,
        defaultModelsExpandDepth: 2,
      },
    }),
  );

  return true;
}
