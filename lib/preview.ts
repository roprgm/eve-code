import type { EveMessage } from "eve/client";
import { z } from "zod";

const sandboxIdSchema = z.string();
const previewUrlSchema = z.string().url();

export const previewRunSchema = z.object({
  command: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe("The project-specific command that starts its dev server on 0.0.0.0."),
  port: z
    .number()
    .int()
    .min(1)
    .max(65_535)
    .describe("The exact configured or framework-default port used by the dev server."),
});

export const previewOutputSchema = z.object({
  sandboxId: sandboxIdSchema,
  url: previewUrlSchema,
});

const storedPreviewOutputSchema = previewOutputSchema.partial({ sandboxId: true });

export type Preview = Readonly<
  z.infer<typeof previewRunSchema> & z.infer<typeof previewOutputSchema>
>;

export function getPreview(
  messages: readonly EveMessage[],
  fallbackSandboxId?: string,
): Preview | undefined {
  let preview: Preview | undefined;
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "dynamic-tool" || part.toolName !== "start_dev") continue;
      if (part.state !== "output-available") continue;
      const input = previewRunSchema.safeParse(part.input);
      const output = storedPreviewOutputSchema.safeParse(part.output);
      if (!input.success || !output.success) continue;
      const sandboxId = output.data.sandboxId ?? fallbackSandboxId;
      if (!sandboxId) continue;
      preview = { ...input.data, ...output.data, sandboxId };
    }
  }
  return preview;
}
