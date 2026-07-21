import type { EveDynamicToolPart } from "eve/client";
import {
  FilePen,
  Files,
  FileText,
  Globe,
  ListTodo,
  type LucideIcon,
  Terminal,
  TextSearch,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";

import Diff from "@/components/code/diff";
import { ModelActivity } from "@/components/session/model-activity";
import { useElapsed } from "@/components/session/use-elapsed";
import { CodeBlock } from "@/components/ui/code-block";
import type { ActivityTiming } from "@/lib/eve-events";
import { parseFileDiff } from "@/lib/file-diff";

type ToolDefinition = {
  readonly active: string;
  readonly done: string;
  readonly input?: string;
  readonly icon: LucideIcon;
};

const TOOL_DEFINITIONS: Readonly<Record<string, ToolDefinition>> = {
  bash: { active: "Running", done: "Ran", icon: Terminal, input: "command" },
  edit_file: { active: "Editing", done: "Edited", icon: FilePen, input: "filePath" },
  glob: { active: "Listing files", done: "Listed files", icon: Files, input: "pattern" },
  grep: { active: "Searching", done: "Searched", icon: TextSearch, input: "pattern" },
  read_file: { active: "Reading", done: "Read", icon: FileText, input: "filePath" },
  start_dev: { active: "Starting", done: "Preview is live", icon: Globe, input: "command" },
  todo: { active: "Updating todos", done: "Updated todos", icon: ListTodo },
  web_fetch: { active: "Fetching", done: "Fetched", icon: Globe, input: "url" },
  write_file: { active: "Creating", done: "Created", icon: FilePen, input: "filePath" },
};

function getInputString(input: unknown, field: string): string | undefined {
  if (!input || typeof input !== "object") return;
  const value = (input as Record<string, unknown>)[field];
  if (typeof value === "string") return value;
}

function getToolDefinition(name: string): ToolDefinition {
  return TOOL_DEFINITIONS[name] ?? { active: `Running ${name}`, done: `Ran ${name}`, icon: Wrench };
}

function getToolDetail(part: EveDynamicToolPart, definition: ToolDefinition): string | undefined {
  if (!definition.input) return;
  const detail = getInputString(part.input, definition.input);
  if (definition.input === "filePath") return detail?.replace(/^\/workspace\//, "");
  return detail;
}

function isSettled(part: EveDynamicToolPart): boolean {
  return (
    part.state === "output-available" ||
    part.state === "output-error" ||
    part.state === "output-denied"
  );
}

function getLabel(
  part: EveDynamicToolPart,
  definition: ToolDefinition,
  isRunning: boolean,
): string {
  if (isRunning) return definition.active;
  if (part.state === "output-error") return "Failed";
  if (part.state === "output-denied") return "Denied";
  return definition.done;
}

function getContent(part: EveDynamicToolPart): ReactNode {
  if (part.state === "output-error") {
    return <CodeBlock>{part.errorText}</CodeBlock>;
  }
  if (part.state !== "output-available") return null;

  if (part.toolName === "edit_file") {
    const output = parseFileDiff(part.output);
    if (!output) return null;
    return <Diff patch={output.diff} />;
  }

  if (part.toolName !== "bash") return null;
  const stdout = getInputString(part.output, "stdout") ?? "";
  const stderr = getInputString(part.output, "stderr") ?? "";
  const output = [stdout, stderr]
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n");
  if (!output) return null;
  return <CodeBlock>{output}</CodeBlock>;
}

type ToolActivityProps = {
  readonly isActive: boolean;
  readonly part: EveDynamicToolPart;
  readonly timing?: ActivityTiming;
};

export function ToolActivity({ isActive, part, timing }: ToolActivityProps) {
  const isRunning = isActive && !isSettled(part);
  const elapsed = useElapsed(timing, isRunning);
  const definition = getToolDefinition(part.toolName);
  const label = getLabel(part, definition, isRunning);
  const content = getContent(part);
  const isExpanded = part.toolName === "edit_file" && part.state === "output-available";

  return (
    <ModelActivity
      detail={getToolDetail(part, definition)}
      elapsed={elapsed}
      icon={definition.icon}
      isAnimated={isRunning}
      isExpanded={isExpanded}
      label={label}
    >
      {content}
    </ModelActivity>
  );
}
