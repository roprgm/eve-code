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
import { type MouseEvent, type ReactNode, useMemo } from "react";

import Diff from "@/components/code/diff";
import { CommandLogs } from "@/components/session/command-logs";
import { ModelActivity } from "@/components/session/model-activity";
import { useElapsed } from "@/components/session/use-elapsed";
import { CodeBlock } from "@/components/ui/code-block";
import { useOpenWorkspaceFile } from "@/components/workspace/workspace-navigation";
import type { ActivityTiming } from "@/lib/eve-events";
import { type FileDiff, getFileDiffStats, parseFileDiff } from "@/lib/file-diff";
import { getStringProperty } from "@/lib/object";
import { joinNonEmptyLines } from "@/lib/text";

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
  load_skill: { active: "Loading skill", done: "Loaded skill", icon: Wrench, input: "skill" },
  read_file: { active: "Reading", done: "Read", icon: FileText, input: "filePath" },
  start_dev: { active: "Starting", done: "Preview is live", icon: Globe, input: "command" },
  todo: { active: "Updating todos", done: "Updated todos", icon: ListTodo },
  web_fetch: { active: "Fetching", done: "Fetched", icon: Globe, input: "url" },
  write_file: { active: "Writing", done: "Wrote", icon: FilePen, input: "filePath" },
};

function getToolDefinition(name: string): ToolDefinition {
  return TOOL_DEFINITIONS[name] ?? { active: `Running ${name}`, done: `Ran ${name}`, icon: Wrench };
}

function getToolDetail(part: EveDynamicToolPart, definition: ToolDefinition): string | undefined {
  if (!definition.input) return;
  const detail = getStringProperty(part.input, definition.input);
  if (definition.input === "filePath") return detail?.replace(/^\/workspace\//, "");
  return detail;
}

function WorkspaceFileLink({ path }: { readonly path: string }) {
  const openFile = useOpenWorkspaceFile();

  function onClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    openFile(path);
  }

  return (
    <button
      className="rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={onClick}
      type="button"
    >
      {path}
    </button>
  );
}

function isSettled(part: EveDynamicToolPart): boolean {
  return (
    part.state === "output-available" ||
    part.state === "output-error" ||
    part.state === "output-denied"
  );
}

function FileDiffStats({ diff }: { readonly diff: FileDiff }) {
  const { additions, deletions } = useMemo(() => getFileDiffStats(diff.diff), [diff.diff]);
  return (
    <span className="flex shrink-0 gap-1 font-mono text-sm">
      <span className="text-destructive">-{deletions}</span>
      <span className="text-success">+{additions}</span>
    </span>
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

function getContent(part: EveDynamicToolPart, fileDiff?: FileDiff): ReactNode {
  if (part.state === "output-error") {
    return <CodeBlock>{part.errorText}</CodeBlock>;
  }
  if (part.state !== "output-available") return null;

  if (fileDiff) return <Diff patch={fileDiff.diff} />;

  if (part.toolName !== "bash") return null;
  const stdout = getStringProperty(part.output, "stdout") ?? "";
  const stderr = getStringProperty(part.output, "stderr") ?? "";
  const output = joinNonEmptyLines([stdout, stderr]);
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
  const fileDiff = part.state === "output-available" ? parseFileDiff(part.output) : undefined;
  let content = getContent(part, fileDiff);
  if (!content && isRunning && part.toolName === "bash") content = <CommandLogs />;
  const path = getToolDetail(part, definition);
  let detail: ReactNode = path;
  if (path && definition.input === "filePath") detail = <WorkspaceFileLink path={path} />;

  return (
    <ModelActivity
      detail={detail}
      elapsed={elapsed}
      icon={definition.icon}
      isAnimated={isRunning}
      label={label}
      meta={fileDiff && <FileDiffStats diff={fileDiff} />}
    >
      {content}
    </ModelActivity>
  );
}
