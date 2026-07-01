import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// Polyfill Blob.arrayBuffer for jsdom
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function (this: Blob): Promise<ArrayBuffer> {
    const blob = this as any;

    // jsdom stores Blob data in a Symbol-keyed property
    const symbols = Object.getOwnPropertySymbols(blob);
    if (symbols.length > 0) {
      const blobImpl = blob[symbols[0]];
      if (blobImpl && blobImpl._buffer) {
        // _buffer is a Node.js Buffer; return it as-is since crypto.subtle can work with it
        return blobImpl._buffer as any;
      }
    }

    throw new Error('Unable to convert Blob to ArrayBuffer');
  };
}

// Wrap crypto.subtle.digest to handle jsdom ArrayBuffers
if (typeof crypto !== 'undefined' && crypto.subtle) {
  const originalDigest = crypto.subtle.digest;
  crypto.subtle.digest = async function (algorithm: string, data: any): Promise<ArrayBuffer> {
    // If data is a jsdom ArrayBuffer (not instanceof ArrayBuffer but has byteLength), convert to Buffer
    if (
      typeof data === 'object' &&
      data !== null &&
      !Buffer.isBuffer(data) &&
      !(data instanceof Uint8Array) &&
      'byteLength' in data &&
      typeof data.byteLength === 'number'
    ) {
      // It's likely a jsdom ArrayBuffer, convert to Node Buffer
      const uint8 = new Uint8Array(data);
      data = Buffer.from(uint8);
    }
    return originalDigest.call(crypto.subtle, algorithm, data);
  };
}
