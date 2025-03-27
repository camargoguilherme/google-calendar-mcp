/**
 * Essential tests for the Google Calendar MCP
 * These tests don't rely on mocking and are designed to validate core functionality
 */

import { TokenManager } from '../token-manager.js';
import { AuthServer } from '../auth-server.js';
import { OAuth2Client } from 'google-auth-library';

describe('Essential Tests', () => {
  // Basic existence tests for core classes
  test('TokenManager class exists', () => {
    expect(TokenManager).toBeDefined();
  });
  
  test('AuthServer class exists', () => {
    expect(AuthServer).toBeDefined();
  });
  
  // Test TokenManager instantiation
  test('TokenManager can be instantiated', () => {
    const mockOAuth2Client = {
      credentials: { expiry_date: Date.now() + 3600 * 1000 },
      on: jest.fn(),
      setCredentials: jest.fn()
    } as unknown as OAuth2Client;
    const tokenManager = new TokenManager(mockOAuth2Client);
    expect(tokenManager).toBeInstanceOf(TokenManager);
  });
  
  // Test AuthServer instantiation
  test('AuthServer can be instantiated', () => {
    const mockOAuth2Client = {
      credentials: {},
      setCredentials: jest.fn()
    } as unknown as OAuth2Client;
    
    // TokenManager is instantiated inside AuthServer, so we need to provide a mock
    jest.mock('../token-manager.js', () => ({
      TokenManager: jest.fn().mockImplementation(() => ({
        loadSavedTokens: jest.fn().mockResolvedValue(true),
        validateTokens: jest.fn().mockResolvedValue(true),
        clearTokens: jest.fn()
      }))
    }));
    
    const authServer = new AuthServer(mockOAuth2Client);
    expect(authServer).toBeInstanceOf(AuthServer);
  });
  
  // Test path handling
  test('TokenManager returns a string for token path', () => {
    const mockOAuth2Client = {
      credentials: { expiry_date: Date.now() + 3600 * 1000 },
      on: jest.fn(),
      setCredentials: jest.fn()
    } as unknown as OAuth2Client;
    const tokenManager = new TokenManager(mockOAuth2Client);
    const path = tokenManager['getSecureTokenPath']();
    expect(typeof path).toBe('string');
    expect(path.endsWith('.gcp-saved-tokens.json')).toBe(true);
  });
});

describe('Validation Tests', () => {
  // Test that validateTokens correctly identifies when no credentials are present
  test('validateTokens returns false when no credentials exist', async () => {
    const mockOAuth2Client = {
      credentials: {}
    } as OAuth2Client;
    
    const tokenManager = new TokenManager(mockOAuth2Client);
    const result = await tokenManager.validateTokens();
    expect(result).toBe(false);
  });
  
  // Test token expiry calculation
  test('validateTokens correctly identifies expired tokens', async () => {
    // Set token expiry to 1 hour ago
    const expiredDate = Date.now() - 3600 * 1000;
    
    const mockOAuth2Client = {
      credentials: {
        access_token: 'expired-token',
        expiry_date: expiredDate
      },
      refreshAccessToken: jest.fn().mockRejectedValue(new Error('Refresh failed'))
    } as unknown as OAuth2Client;
    
    const tokenManager = new TokenManager(mockOAuth2Client);
    // Temporarily replace the refreshToken function to prevent actual API calls
    tokenManager['refreshToken'] = jest.fn().mockRejectedValue(new Error('Mock refresh failure'));
    
    const result = await tokenManager.validateTokens();
    expect(result).toBe(false);
  });
});