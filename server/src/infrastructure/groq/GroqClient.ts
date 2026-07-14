import type { ILlmClient } from "../../application/analysis/ports";
import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/logger/logger";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 45_000;

interface GroqChatResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { total_tokens?: number };
}

/**
 * Groq chat-completions client implementing the ILlmClient port.
 *
 * - Uses strict JSON-schema structured outputs (`response_format.json_schema`,
 *   supported by the openai/gpt-oss production models) so responses are
 *   guaranteed schema-valid — verified live against the API.
 * - Accepts multiple API keys and fails over to the next key when a request
 *   is rejected (401/403/429) or errors (5xx / network / timeout). Each key
 *   is tried at most once per completion — no unbounded retries.
 */
export class GroqClient implements ILlmClient {
  private readonly tokens: string[];

  constructor(
    tokens: Array<string | undefined>,
    private readonly model: string,
  ) {
    this.tokens = tokens.filter((t): t is string => Boolean(t && t.trim()));
    if (this.tokens.length === 0) {
      throw new Error("GroqClient requires at least one API token");
    }
  }

  async completeJson<T>(params: {
    system: string;
    user: string;
    schema: Record<string, unknown>;
    schemaName: string;
  }): Promise<T> {
    let lastError: unknown = null;

    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i]!;
      try {
        const result = await this.requestOnce<T>(token, params);
        if (i > 0) logger.info("Groq request succeeded on fallback key", { keyIndex: i + 1 });
        return result;
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        logger.warn("Groq request failed — trying next key if available", {
          keyIndex: i + 1,
          keysTotal: this.tokens.length,
          error: message.slice(0, 300),
        });
      }
    }

    throw AppError.externalService(
      "Groq",
      `All ${this.tokens.length} API key(s) failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  private async requestOnce<T>(
    token: string,
    params: { system: string; user: string; schema: Record<string, unknown>; schemaName: string },
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: params.schemaName,
              strict: true,
              schema: params.schema,
            },
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
      }

      const data = (await res.json()) as GroqChatResponse;
      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error("Empty completion content");

      logger.debug("Groq completion ok", { model: this.model, totalTokens: data.usage?.total_tokens });
      return JSON.parse(content) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
