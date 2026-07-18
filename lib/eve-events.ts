import {
  type ClientMessageSubmittedEvent,
  defaultMessageReducer,
  type EveAgentReducerEvent,
  type EveMessage,
  type HandleMessageStreamEvent,
} from "eve/client";

export type OptimisticMessage = {
  readonly createdAt: number;
  readonly message: string;
  readonly startIndex: number;
  readonly submissionId: string;
};

export type StoredEveEvent = {
  readonly event: HandleMessageStreamEvent;
  readonly index: number;
};

type ProjectedEveMessage = EveMessage & { readonly createdAt?: number };

function optimisticEvent(optimistic: OptimisticMessage): EveAgentReducerEvent {
  return {
    data: {
      createdAt: optimistic.createdAt,
      message: optimistic.message,
      submissionId: optimistic.submissionId,
    },
    type: "client.message.submitted",
  } satisfies ClientMessageSubmittedEvent;
}

export function projectEveMessages(
  storedEvents: readonly StoredEveEvent[],
  optimistic?: OptimisticMessage,
): readonly ProjectedEveMessage[] {
  const startIndex = optimistic?.startIndex ?? Number.POSITIVE_INFINITY;
  const before = storedEvents
    .filter((stored) => stored.index < startIndex)
    .map(({ event }) => event);
  const after = storedEvents
    .filter((stored) => stored.index >= startIndex)
    .map(({ event }) => event);
  const projected: EveAgentReducerEvent[] = [...before];
  const received = after.find((event) => event.type === "message.received");
  if (optimistic && !received) projected.push(optimisticEvent(optimistic));
  projected.push(...after);

  const createdAt = new Map<string, number>();
  for (const { event } of storedEvents) {
    const timestamp = Date.parse(event.meta?.at ?? "");
    if (!Number.isFinite(timestamp)) continue;
    if (event.type === "turn.started") {
      createdAt.set(`${event.data.turnId}:assistant`, timestamp);
    }
    if (event.type === "message.received") {
      createdAt.set(`${event.data.turnId}:user`, timestamp);
    }
  }
  if (optimistic) {
    createdAt.set(`optimistic:${optimistic.submissionId}:user`, optimistic.createdAt);
  }
  if (optimistic && received) {
    createdAt.set(`${received.data.turnId}:user`, optimistic.createdAt);
  }

  const reducer = defaultMessageReducer();
  const { messages } = projected.reduce(reducer.reduce, reducer.initial());
  return messages.map((message) => {
    const timestamp = createdAt.get(message.id);
    if (timestamp === undefined) return message;
    return { ...message, createdAt: timestamp };
  });
}
