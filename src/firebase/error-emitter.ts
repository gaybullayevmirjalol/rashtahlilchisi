'use client';

// A simple event emitter for handling global errors, particularly for Firebase.
// This allows different parts of the app to communicate without direct dependencies.

type EventMap = {
  'permission-error': (error: Error) => void;
  [key: string]: (...args: any[]) => void;
};

class Emitter {
  private events: Partial<EventMap> = {};

  on<K extends keyof EventMap>(event: K, listener: EventMap[K]): void {
    this.events[event] = listener;
  }

  off<K extends keyof EventMap>(event: K): void {
    delete this.events[event];
  }

  emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
    const listener = this.events[event];
    if (listener) {
      listener(...args);
    }
  }
}

export const errorEmitter = new Emitter();
