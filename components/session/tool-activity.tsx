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

import { ModelActivity } from "@/components/session/model-activity";
import { useElapsed } from "@/components/session/use-elapsed";
import type { ActivityTiming } from "@/lib/eve-events";

type ToolLabels = {
  readonly active: string;
  readonly detail?: string;
  readonly done: string;
  readonly failed: string;
  readonly icon: LucideIcon;
};

function getInputString(input: unknown, field: string): string | undefined {
  if (!input || typeof input !== "object") return;
  const value = (input as Record<string, unknown>)[field];
  if (typeof value === "string") return value;
}

function formatWorkspacePath(path: string | undefined): string | undefined {
  return path?.replace(/^\/workspace\//, "");
}

function getToolLabels(part: EveDynamicToolPart): ToolLabels {
  const name = part.toolName;
  if (name === "bash") {
    return {
      active: "Running",
      detail: getInputString(part.input, "command"),
      done: "Ran",
      failed: "Failed",
      icon: Terminal,
    };
  }
  if (name === "read_file") {
    return {
      active: "Reading",
      detail: formatWorkspacePath(getInputString(part.input, "filePath")),
      done: "Read",
      failed: "Failed to read",
      icon: FileText,
    };
  }
  if (name === "write_file") {
    return {
      active: "Writing",
      detail: formatWorkspacePath(getInputString(part.input, "filePath")),
      done: "Wrote",
      failed: "Failed to write",
      icon: FilePen,
    };
  }
  if (name === "glob") {
    return {
      active: "Listing files",
      detail: getInputString(part.input, "pattern"),
      done: "Listed files",
      failed: "Failed to list files",
      icon: Files,
    };
  }
  if (name === "grep") {
    return {
      active: "Searching",
      detail: getInputString(part.input, "pattern"),
      done: "Searched",
      failed: "Failed to search",
      icon: TextSearch,
    };
  }
  if (name === "todo") {
    return {
      active: "Updating todos",
      done: "Updated todos",
      failed: "Failed to update todos",
      icon: ListTodo,
    };
  }
  if (name === "web_fetch") {
    return {
      active: "Fetching",
      detail: getInputString(part.input, "url"),
      done: "Fetched",
      failed: "Failed to fetch",
      icon: Globe,
    };
  }
  return { active: `Running ${name}`, done: `Ran ${name}`, failed: `${name} failed`, icon: Wrench };
}

function isSettled(part: EveDynamicToolPart): boolean {
  return (
    part.state === "output-available" ||
    part.state === "output-error" ||
    part.state === "output-denied"
  );
}

function getLabel(part: EveDynamicToolPart, labels: ToolLabels, isRunning: boolean): string {
  if (isRunning) return labels.active;
  if (part.state === "output-error") return labels.failed;
  return labels.done;
}

function getDetails(part: EveDynamicToolPart): string | undefined {
  if (part.state === "output-error") return part.errorText;
  if (part.state !== "output-available") return;
  if (part.toolName !== "bash") return;
  const stdout = getInputString(part.output, "stdout") ?? "";
  const stderr = getInputString(part.output, "stderr") ?? "";
  const output = [stdout, stderr]
    .map((text) => text.trim())
    .filter(Boolean)
    .join("\n");
  if (output) return output;
}

type ToolActivityProps = {
  readonly isActive: boolean;
  readonly part: EveDynamicToolPart;
  readonly timing?: ActivityTiming;
};

export function ToolActivity({ isActive, part, timing }: ToolActivityProps) {
  const isRunning = isActive && !isSettled(part);
  const elapsed = useElapsed(timing, isRunning);
  const labels = getToolLabels(part);
  const label = getLabel(part, labels, isRunning);
  const details = getDetails(part);

  return (
    <ModelActivity
      detail={labels.detail}
      elapsed={elapsed}
      icon={labels.icon}
      isAnimated={isRunning}
      label={label}
    >
      {details && (
        <pre className="max-h-64 overflow-y-auto wrap-anywhere whitespace-pre-wrap font-mono text-sm">
          {details}
        </pre>
      )}
    </ModelActivity>
  );
}
