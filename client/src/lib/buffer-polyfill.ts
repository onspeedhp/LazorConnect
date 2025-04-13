// Create a custom Buffer polyfill for browser environment
class BufferPolyfill {
  static from(data: any, encoding?: string): Uint8Array {
    if (typeof data === 'string') {
      // Convert string to Uint8Array using TextEncoder
      const encoder = new TextEncoder();
      return encoder.encode(data);
    } else if (Array.isArray(data)) {
      // Convert array to Uint8Array
      return new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      // Already a Uint8Array
      return data;
    }
    // Default fallback
    return new Uint8Array();
  }

  static alloc(size: number): Uint8Array {
    return new Uint8Array(size);
  }

  static isBuffer(obj: any): boolean {
    return obj instanceof Uint8Array;
  }
}

// Make our polyfill available globally
if (typeof window !== 'undefined') {
  (window as any).Buffer = BufferPolyfill;
}

export const Buffer = BufferPolyfill;