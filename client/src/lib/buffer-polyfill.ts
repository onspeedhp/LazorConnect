// Import the Buffer from the buffer package
import { Buffer as BufferPolyfill } from 'buffer';

// Make it available globally if it doesn't already exist
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Buffer = window.Buffer || BufferPolyfill;
}

export { BufferPolyfill as Buffer };