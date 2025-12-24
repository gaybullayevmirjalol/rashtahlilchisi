'use client';

// A custom error class for more detailed Firestore permission errors.
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `Firestore Permission Denied: Cannot ${context.operation} at path: ${context.path}.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is to ensure the stack trace is captured correctly.
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, FirestorePermissionError);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}
