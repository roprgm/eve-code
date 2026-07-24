import {
  type ClientInputRespondedEvent,
  type ClientMessageSubmittedEvent,
  defaultMessageReducer,
  type EveAgentReducerEvent,
  type EveMessage,
  type InputResponse,
} from "eve/client";

export type OptimisticTurn = {
  readonly createdAt: number;
  readonly inputResponses?: readonly InputResponse[];
  readonly message?: string;
  readonly startIndex: number;
  readonly submissionId: string;
};

export type StoredEveEvent = {
  readonly event: EveAgentReducerEvent;
  readonly index: number;
};

export type ActivityTiming = {
  readonly endedAt?: number;
  readonly startedAt?: number;
};

type ProjectedEveMessage = EveMessage & { readonly createdAt?: number };

export function getToolTimingKey(callId: string): string {
  return `tool:${callId}`;
}

export function getReasoningTimingKey(turnId: string | undefined, stepIndex: number): string {
  return `reasoning:${turnId}:${stepIndex}`;
}

export function projectActivityTimings(
  storedEvents: readonly StoredEveEvent[],
): ReadonlyMap<string, ActivityTiming> {
  const timings = new Map<string, ActivityTiming>();
  const begin = (key: string, startedAt: number) => {
    if (!timings.has(key)) timings.set(key, { startedAt });
  };
  const end = (key: string, endedAt: number) => {
    timings.set(key, { ...timings.get(key), endedAt });
  };

  for (const { event } of storedEvents) {
    if (event.type === "client.input.responded") continue;
    if (event.type === "client.message.failed") continue;
    if (event.type === "client.message.submitted") continue;
    const timestamp = Date.parse(event.meta?.at ?? "");
    if (!Number.isFinite(timestamp)) continue;
    if (event.type === "step.started") {
      begin(getReasoningTimingKey(event.data.turnId, event.data.stepIndex), timestamp);
    }
    if (event.type === "reasoning.completed") {
      end(getReasoningTimingKey(event.data.turnId, event.data.stepIndex), timestamp);
    }
    if (event.type === "actions.requested") {
      for (const action of event.data.actions) begin(getToolTimingKey(action.callId), timestamp);
    }
    if (event.type === "action.result") {
      end(getToolTimingKey(event.data.result.callId), timestamp);
    }
  }
  return timings;
}

function optimisticMessageEvent(
  optimistic: OptimisticTurn,
): ClientMessageSubmittedEvent | undefined {
  if (optimistic.message === undefined) return;
  return {
    data: {
      createdAt: optimistic.createdAt,
      message: optimistic.message,
      submissionId: optimistic.submissionId,
    },
    type: "client.message.submitted",
  } satisfies ClientMessageSubmittedEvent;
}

function inputResponseEvent(
  responses: readonly InputResponse[],
  createdAt: number,
): ClientInputRespondedEvent {
  return {
    data: { createdAt, responses },
    type: "client.input.responded",
  };
}

export function projectEveMessages(
  storedEvents: readonly StoredEveEvent[],
  optimistic?: OptimisticTurn,
): readonly ProjectedEveMessage[] {
  const startIndex = optimistic?.startIndex ?? Number.POSITIVE_INFINITY;
  const before = storedEvents.filter((stored) => stored.index < startIndex);
  const after = storedEvents.filter((stored) => stored.index >= startIndex);
  const projected: EveAgentReducerEvent[] = [];
  projected.push(...before.map(({ event }) => event));

  const received = after.find(({ event }) => event.type === "message.received");
  const messageEvent = optimistic && !received ? optimisticMessageEvent(optimistic) : undefined;
  if (messageEvent) projected.push(messageEvent);
  if (optimistic?.inputResponses?.length) {
    projected.push(inputResponseEvent(optimistic.inputResponses, optimistic.createdAt));
  }
  projected.push(...after.map(({ event }) => event));

  const createdAt = new Map<string, number>();
  for (const { event } of storedEvents) {
    if (event.type === "client.input.responded") continue;
    if (event.type === "client.message.failed") continue;
    if (event.type === "client.message.submitted") continue;
    const timestamp = Date.parse(event.meta?.at ?? "");
    if (!Number.isFinite(timestamp)) continue;
    if (event.type === "turn.started") {
      createdAt.set(`${event.data.turnId}:assistant`, timestamp);
    }
    if (event.type === "message.received") {
      createdAt.set(`${event.data.turnId}:user`, timestamp);
    }
  }
  if (optimistic?.message !== undefined) {
    createdAt.set(`optimistic:${optimistic.submissionId}:user`, optimistic.createdAt);
  }
  if (optimistic?.message !== undefined && received?.event.type === "message.received") {
    createdAt.set(`${received.event.data.turnId}:user`, optimistic.createdAt);
  }

  const reducer = defaultMessageReducer();
  const { messages } = projected.reduce(reducer.reduce, reducer.initial());
  return messages.map((message) => {
    const timestamp = createdAt.get(message.id);
    if (timestamp === undefined) return message;
    return { ...message, createdAt: timestamp };
  });
}
