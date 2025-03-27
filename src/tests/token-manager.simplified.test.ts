/**
 * Simplified TokenManager tests
 */
import { TokenManager } from '../token-manager.js';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');

describe('TokenManager Basic Tests', () => {
  let tokenManager;
  let mockOAuth2Client;
  
  beforeEach(() => {
    // Reset the mock
    jest.clearAllMocks();
    
    // Create mock OAuth client
    mockOAuth2Client = {
      credentials: {},
      setCredentials: jest.fn(),
      on: jest.fn(),
      refreshAccessToken: jest.fn().mockResolvedValue({
        credentials: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expiry_date: Date.now() + 3600 * 1000
        }
      })
    };
    
    // Create token manager
    tokenManager = new TokenManager(mockOAuth2Client);
    
    // Override getSecureTokenPath for testing
    tokenManager.getSecureTokenPath = jest.fn().mockReturnValue('/.gcp-saved-tokens.json');
  });
  
  afterEach(() => {
    fs.__resetMockData();
  });
  
  test('should initialize with OAuth2Client', () => {
    expect(tokenManager).toBeDefined();
  });
  
  test('loadSavedTokens should return false if no token file exists', async () => {
    // No mock data, so file doesn't exist
    const result = await tokenManager.loadSavedTokens();
    expect(result).toBe(false);
  });
  
  test('loadSavedTokens should return true if token file exists', async () => {
    // Set mock data
    const mockTokens = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 3600 * 1000
    };
    
    fs.__setMockTokenData(JSON.stringify(mockTokens));
    
    const result = await tokenManager.loadSavedTokens();
    expect(result).toBe(true);
    expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith(mockTokens);
  });
  
  test('saveTokens should save tokens to file', async () => {
    const mockTokens = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expiry_date: Date.now() + 3600 * 1000
    };
    
    await tokenManager.saveTokens(mockTokens);
    
    expect(fs.writeFile).toHaveBeenCalled();
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
});