/**
 * Simplified AuthServer tests
 */
import { AuthServer } from '../auth-server.js';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs/promises';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('express');
jest.mock('open');

describe('AuthServer Basic Tests', () => {
  let authServer;
  let mockOAuth2Client;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock OAuth client
    mockOAuth2Client = {
      credentials: {},
      setCredentials: jest.fn(),
      on: jest.fn(),
      generateAuthUrl: jest.fn().mockReturnValue('https://example.com/auth'),
      getToken: jest.fn().mockResolvedValue({
        tokens: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expiry_date: Date.now() + 3600 * 1000
        }
      })
    };
    
    // Create auth server
    authServer = new AuthServer(mockOAuth2Client);
    
    // Mock methods
    authServer.getKeysFilePath = jest.fn().mockReturnValue('/gcp-oauth.keys.json');
  });
  
  test('should initialize with OAuth2Client', () => {
    expect(authServer).toBeDefined();
  });
  
  test('start should create auth server and open browser', async () => {
    // Mock TokenManager to return false (no valid tokens)
    const mockTokenManager = {
      loadSavedTokens: jest.fn().mockResolvedValue(false),
      saveTokens: jest.fn().mockResolvedValue(undefined)
    };
    
    authServer.tokenManager = mockTokenManager;
    
    // Mock start server
    authServer.startServer = jest.fn().mockResolvedValue(true);
    
    const result = await authServer.start();
    
    expect(result).toBe(true);
    expect(authServer.startServer).toHaveBeenCalled();
  });
  
  test('stop should close the HTTP server if it exists', async () => {
    // Setup mock HTTP server
    authServer.httpServer = {
      close: jest.fn().mockImplementation(callback => {
        callback();
        return Promise.resolve();
      })
    };
    
    await authServer.stop();
    
    expect(authServer.httpServer.close).toHaveBeenCalled();
    expect(authServer.server).toBeNull();
    expect(authServer.httpServer).toBeNull();
  });
});