// Create a more comprehensive Buffer polyfill for Solana web3.js
class BufferPolyfill extends Uint8Array {
  // Add common Buffer methods needed for Solana
  static from(data: any, encoding?: string): BufferPolyfill {
    if (typeof data === 'string') {
      // Convert string to Uint8Array using TextEncoder
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(data);
      return new BufferPolyfill(uint8Array);
    } else if (Array.isArray(data)) {
      // Convert array to Uint8Array
      return new BufferPolyfill(data);
    } else if (data instanceof Uint8Array) {
      // Already a Uint8Array
      return new BufferPolyfill(data);
    }
    // Default fallback
    return new BufferPolyfill(0);
  }

  static alloc(size: number, fill?: number): BufferPolyfill {
    const buf = new BufferPolyfill(size);
    if (fill !== undefined) {
      buf.fill(fill);
    }
    return buf;
  }

  static isBuffer(obj: any): boolean {
    return obj instanceof BufferPolyfill || obj instanceof Uint8Array;
  }

  // Add toString method for encoding/decoding
  toString(encoding?: string): string {
    // Simple implementation for common encodings
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(this);
  }

  // Add write methods for compatibility
  write(string: string, offset: number = 0): number {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(string);
    this.set(bytes, offset);
    return bytes.length;
  }

  // Add readUInt methods commonly used
  readUInt8(offset: number = 0): number {
    return this[offset];
  }

  readUInt16LE(offset: number = 0): number {
    return this[offset] | (this[offset + 1] << 8);
  }

  readUInt32LE(offset: number = 0): number {
    return (
      this[offset] |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
    );
  }

  slice(start?: number, end?: number): BufferPolyfill {
    return new BufferPolyfill(super.slice(start, end));
  }

  // Add commonly used methods for Solana
  equals(otherBuffer: Uint8Array): boolean {
    if (this.length !== otherBuffer.length) return false;
    for (let i = 0; i < this.length; i++) {
      if (this[i] !== otherBuffer[i]) return false;
    }
    return true;
  }
}

// Make our polyfill available globally
if (typeof window !== 'undefined') {
  (window as any).Buffer = BufferPolyfill;
}

export const Buffer = BufferPolyfill;