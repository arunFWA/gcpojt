/**
 * StoreOps EventBus.
 *
 * Architecture rule (non-negotiable, enforced by the harness Evaluator):
 * Side effects that cross a module boundary MUST be raised through
 * EventBus.emit(...) and consumed through EventBus.on(...). Direct imports
 * of a sibling module's service (e.g. `alerts` importing `NotificationService`
 * into `activities`) are a hard-gate failure.
 *
 * This directly closes failure modes #1 and #4 from the client engagement:
 * "Direct imports from another module's repository, bypassing the agreed
 * service boundary and event bus" and "Missing event bus integration --
 * state changes written directly to sibling module repositories."
 *
 * In production this same contract maps 1:1 onto a managed pub/sub layer
 * (e.g. GCP Pub/Sub) -- see .harness/skills/app-context/SKILL.md, "GCP
 * production topology" for how each StoreOpsEvent name becomes a Pub/Sub
 * topic and each `.on()` subscriber becomes a push subscription / Cloud
 * Run service. Swapping the transport does not change this contract.
 */

export type StoreOpsEventName =
  | 'ACTIVITY_CREATED'
  | 'ACTIVITY_UPDATED'
  | 'ACTIVITY_SLA_BREACH'
  | 'ACTIVITY_SLA_ESCALATION'
  | 'PROGRAMME_CLOSED'
  | 'PROGRAMME_MEMBER_ADDED';

export interface StoreOpsEvent<TPayload = unknown> {
  name: StoreOpsEventName;
  payload: TPayload;
  emittedAt: string;
  correlationId: string;
}

type Handler<T = unknown> = (event: StoreOpsEvent<T>) => void | Promise<void>;

class InMemoryEventBus {
  private handlers = new Map<StoreOpsEventName, Handler[]>();

  public on<T = unknown>(name: StoreOpsEventName, handler: Handler<T>): void {
    const list = this.handlers.get(name) ?? [];
    list.push(handler as Handler);
    this.handlers.set(name, list);
  }

  public async emit<T = unknown>(name: StoreOpsEventName, payload: T, correlationId: string): Promise<void> {
    const event: StoreOpsEvent<T> = {
      name,
      payload,
      emittedAt: new Date().toISOString(),
      correlationId,
    };
    const list = this.handlers.get(name) ?? [];
    for (const handler of list) {
      // Sequential await keeps ordering deterministic for tests; production
      // Pub/Sub delivery would be async/parallel with idempotent handlers.
      await handler(event);
    }
  }

  /** Test-only: clears all subscriptions between test files. */
  public reset(): void {
    this.handlers.clear();
  }
}

export const EventBus = new InMemoryEventBus();
