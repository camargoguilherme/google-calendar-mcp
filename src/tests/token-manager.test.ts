import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TokenManager } from '../token-manager.js';
import { createMockOAuth2Client } from '../mocks/oauth-client.mock.js';
import { mockFsPromises } from '../mocks/fs-promises.mock.js';

// Mock fs/promises module
jest.mock('fs/promises', () => mockFsPromises);

describe('TokenManager', () => {
  const mockTokenPath = '/mock-path/.gcp-saved-tokens.json';
  let tokenManager: TokenManager;
  let mockOAuth2Client: ReturnType<typeof createMockOAuth2Client>;
  
  beforeEach(() => {
    jest.useFakeTimers();
    mockFsPromises.reset();
    mockOAuth2Client = createMockOAuth2Client();
    
    // Mock getSecureTokenPath to return a consistent path for testing
    jest.spyOn(TokenManager.prototype as any, 'getSecureTokenPath')
      .mockReturnValue(mockTokenPath);
    
    tokenManager = new TokenManager(mockOAuth2Client);
  });
  
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  
  test('should initialize with the provided OAuth2Client', () => {
    expect(tokenManager).toBeDefined();
  });
  
  test('loadSavedTokens should return false if no token file exists', async () => {
    // No file setup
    const result = await tokenManager.loadSavedTokens();
    expect(result).toBe(false);
    expect(mockFsPromises.readFile).toHaveBeenCalledWith(mockTokenPath, 'utf-8');
  });
  
  test('loadSavedTokens should return true and set credentials if token file exists', async () => {
    const mockTokens = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 3600 * 1000
    };
    
    mockFsPromises.setupMockFile(mockTokenPath, JSON.stringify(mockTokens));
    
    const result = await tokenManager.loadSavedTokens();
    
    expect(result).toBe(true);
    expect(mockFsPromises.readFile).toHaveBeenCalledWith(mockTokenPath, 'utf-8');
    expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith(mockTokens);
  });
  
  test('saveTokens should save tokens to file and set credentials', async () => {
    const mockTokens = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expiry_date: Date.now() + 3600 * 1000
    };
    
    await tokenManager.saveTokens(mockTokens);
    
    expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
      mockTokenPath,
      JSON.stringify(mockTokens, null, 2),
      { mode: 0o600 }
    );
    expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith(mockTokens);
  });
  
  test('validateTokens should return false if no access token', async () => {
    mockOAuth2Client.credentials = {};
    const result = await tokenManager.validateTokens();
    expect(result).toBe(false);
  });
  
  test('validateTokens should return true if valid access token', async () => {
    mockOAuth2Client.credentials = {
      access_token: 'valid-token',
      expiry_date: Date.now() + 3600 * 1000
    };
    
    const result = await tokenManager.validateTokens();
    expect(result).toBe(true);
  });
  
  test('validateTokens should attempt refresh if token expired', async () => {
    const refreshSpy = jest.spyOn(tokenManager as any, 'refreshToken');
    
    mockOAuth2Client.credentials = {
      access_token: 'expired-token',
      refresh_token: 'refresh-token',
      expiry_date: Date.now() - 1000
    };
    
    const result = await tokenManager.validateTokens();
    
    expect(refreshSpy).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  test('clearTokens should clear refresh timer', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    // Setup refresh timer
    mockOAuth2Client.credentials = {
      access_token: 'valid-token',
      expiry_date: Date.now() + 3600 * 1000
    };
    
    tokenManager.clearTokens();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});