// Mock implementation for fs/promises

let tokenFileData = null;
let tokenFilePath = '/.gcp-saved-tokens.json';

export const readFile = jest.fn(async (path, encoding) => {
  if (path.includes(tokenFilePath) && tokenFileData) {
    return tokenFileData;
  }
  
  // Mock keys file for OAuth
  if (path.includes('gcp-oauth.keys.json')) {
    return JSON.stringify({
      installed: {
        client_id: 'mock-client-id',
        client_secret: 'mock-client-secret',
        redirect_uris: ['http://localhost:3000/oauth2callback']
      }
    });
  }
  
  const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
  error.code = 'ENOENT';
  throw error;
});

export const writeFile = jest.fn(async (path, data, options) => {
  if (path.includes(tokenFilePath)) {
    tokenFileData = data;
    return;
  }
});

export const access = jest.fn(async (path) => {
  if (path.includes(tokenFilePath) && tokenFileData) {
    return true;
  }
  
  const error = new Error(`ENOENT: no such file or directory, access '${path}'`);
  error.code = 'ENOENT';
  throw error;
});

// Helper for tests to set mock file data
export function __setMockTokenData(data) {
  tokenFileData = data;
}

// Helper for tests to reset mock data
export function __resetMockData() {
  tokenFileData = null;
}