
'use client';

import { useState, useEffect } from 'react';

type ScriptStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useScript(src: string): ScriptStatus {
  const [status, setStatus] = useState<ScriptStatus>(src ? 'loading' : 'idle');

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      return;
    }

    // Check if the script is already added to the DOM
    let script = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.setAttribute('data-status', 'loading');
      document.body.appendChild(script);

      const setAttributeFromEvent = (event: Event) => {
        script.setAttribute('data-status', event.type === 'load' ? 'ready' : 'error');
      };

      script.addEventListener('load', setAttributeFromEvent);
      script.addEventListener('error', setAttributeFromEvent);
    } else {
      // If script already exists, use its status
      const currentStatus = script.getAttribute('data-status') as ScriptStatus;
      setStatus(currentStatus || 'loading');
    }

    const setStateFromEvent = (event: Event) => {
      setStatus(event.type === 'load' ? 'ready' : 'error');
    };

    // Add event listeners
    script.addEventListener('load', setStateFromEvent);
    script.addEventListener('error', setStateFromEvent);

    // Remove event listeners on cleanup
    return () => {
      if (script) {
        script.removeEventListener('load', setStateFromEvent);
        script.removeEventListener('error', setStateFromEvent);
      }
    };
  }, [src]);

  return status;
}
