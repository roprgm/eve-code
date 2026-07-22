import { type HandleMessageStreamEvent, isCurrentTurnBoundaryEvent } from "eve/client";

import { getStringProperty } from "@/lib/object";
import { joinNonEmptyLines } from "@/lib/text";

type Entry = { readonly event: HandleMessageStreamEvent; readonly index: number };

export type TurnUsage = { readonly inputTokens: number; readonly outputTokens: number };

function checkpointStatus(
  events: readonly HandleMessageStreamEvent[],
  boundary: HandleMessageStreamEvent,
): "error" | "ready" {
  if (boundary.type === "session.failed") return "error";
  if (events.some((event) => event.type === "turn.failed")) return "error";
  return "ready";
}

function getTurnId(event: HandleMessageStreamEvent): string | undefined {
  if (!("data" in event)) return;
  return getStringProperty(event.data, "turnId");
}

function sumUsage(events: readonly HandleMessageStreamEvent[]): TurnUsage {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const event of events) {
    if (event.type !== "step.completed") continue;
    inputTokens += event.data.usage?.inputTokens ?? 0;
    outputTokens += event.data.usage?.outputTokens ?? 0;
  }
  return { inputTokens, outputTokens };
}

function searchableText(event: HandleMessageStreamEvent): string {
  if (event.type === "message.received") return event.data.message;
  if (event.type === "message.completed") return event.data.message ?? "";
  if (event.type === "message.appended") return event.data.messageSoFar;
  if (event.type === "reasoning.completed") return event.data.reasoning;
  if (event.type === "reasoning.appended") return event.data.reasoningSoFar;
  if (event.type === "input.requested") {
    return event.data.requests.map((request) => request.prompt).join("\n");
  }
  return "";
}

export function compactTurn(events: readonly HandleMessageStreamEvent[], startIndex: number) {
  if (!Number.isSafeInteger(startIndex) || startIndex < 0) throw new Error("Invalid cursor.");
  const boundary = events.at(-1);
  if (!boundary || !isCurrentTurnBoundaryEvent(boundary)) throw new Error("Missing boundary.");

  const settled: Entry[] = [];
  const partial = new Map<string, Entry>();
  let turnId: string | undefined;
  for (const [offset, event] of events.entries()) {
    const eventTurnId = getTurnId(event);
    if (!turnId && eventTurnId) turnId = eventTurnId;
    if (!turnId) continue;
    if (eventTurnId && eventTurnId !== turnId) throw new Error("Replay crossed turns.");
    const entry = { event, index: startIndex + offset };
    if (event.type === "message.appended" || event.type === "reasoning.appended") {
      partial.set(`${event.type}:${event.data.stepIndex}`, entry);
      continue;
    }
    if (event.type === "message.completed") {
      partial.delete(`message.appended:${event.data.stepIndex}`);
    }
    if (event.type === "reasoning.completed") {
      partial.delete(`reasoning.appended:${event.data.stepIndex}`);
    }
    settled.push(entry);
  }
  if (!turnId) throw new Error("Replay contained no turn.");

  const compactEvents = [...settled, ...partial.values()].sort(
    (left, right) => left.index - right.index,
  );
  const searchText = joinNonEmptyLines(compactEvents.map(({ event }) => searchableText(event)));
  return {
    events: compactEvents,
    searchText,
    status: checkpointStatus(events, boundary),
    streamIndex: startIndex + events.length,
    turnId,
    usage: sumUsage(events),
  };
}
