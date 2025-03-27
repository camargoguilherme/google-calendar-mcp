import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AuthServer } from '../auth-server.js';
import { createMockOAuth2Client } from '../mocks/oauth-client.mock.js';
import { mockFsPromises } from '../mocks/fs-promises.mock.js';
import express from 'express';
import supertest from 'supertest';

// Mock fs/promises
jest.mock('fs/promises', () => mockFsPromises);

// Mock express
jest.mock('express', () => {
  const mockApp = {
    get: jest.fn(),
    listen: jest.fn()
  };
  
  const mockExpress = jest.fn(() => mockApp);
  return mockExpress;
});

// Mock open package
jest.mock('open', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true)
}));

describe('AuthServer', () => {
  let authServer: AuthServer;
  let mockOAuth2Client: ReturnType<typeof createMockOAuth2Client>;
  
  beforeEach(() => {
    mockFsPromises.reset();
    mockOAuth2Client = createMockOAuth2Client();
    
    // Setup mock credentials file
    const mockCredentials = {
      installed: {
        client_id: 'mock-client-id',
        client_secret: 'mock-client-secret',
        redirect_uris: ['http://localhost:3000/oauth2callback']
      }
    };
    
    mockFsPromises.setupMockFile(
      `${process.cwd()}/gcp-oauth.keys.json`,
      JSON.stringify(mockCredentials)
    );
    
    // Mock getKeysFilePath to return a consistent path
    jest.spyOn(AuthServer.prototype as any, 'getKeysFilePath')
      .mockReturnValue(`${process.cwd()}/gcp-oauth.keys.json`);
      
    authServer = new AuthServer(mockOAuth2Client);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  test('should initialize with provided OAuth2Client', () => {
    expect(authServer).toBeDefined();
  });
  
  test('should load credentials from keys file', async () => {
    const loadCredentialsSpy = jest.spyOn(authServer as any, 'loadCredentials');
    
    await (authServer as any).loadCredentials();
    
    expect(loadCredentialsSpy).toHaveBeenCalled();
    expect((authServer as any).credentials).toEqual({
      client_id: 'mock-client-id',
      client_secret: 'mock-client-secret'
    });
  });
  
  test('start should return true if valid tokens exist', async () => {
    // Mock TokenManager.loadSavedTokens to return true
    jest.spyOn(authServer as any, 'tokenManager')
      .mockImplementation({
        loadSavedTokens: jest.fn().mockResolvedValue(true)
      });
    
    const result = await authServer.start();
    
    expect(result).toBe(true);
  });
  
  test('createOAuthClient should create a client with correct redirect URI', async () => {
    await (authServer as any).loadCredentials();
    const client = (authServer as any).createOAuthClient(3000);
    
    expect(client).toBeDefined();
  });
  
  test('startServer should try multiple ports if first port is in use', async () => {
    // Setup mock server that fails on first port
    const mockHttpServer = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'error') {
          callback({ code: 'EADDRINUSE' });
        }
      }),
      close: jest.fn().mockImplementation(callback => callback())
    };
    
    // Mock express app
    const mockApp = {
      get: jest.fn(),
      listen: jest.fn().mockReturnValue(mockHttpServer)
    };
    
    (express as jest.Mock).mockReturnValue(mockApp);
    
    // Second port should succeed
    const secondMockHttpServer = {
      on: jest.fn(),
      close: jest.fn().mockImplementation(callback => callback())
    };
    
    mockApp.listen.mockReturnValueOnce(mockHttpServer)
             .mockReturnValueOnce(secondMockHttpServer);
    
    await (authServer as any).loadCredentials();
    
    const result = await (authServer as any).startServer();
    
    expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(mockApp.listen).toHaveBeenCalledWith(3001, expect.any(Function));
  });
  
  test('stop should close the HTTP server', async () => {
    const mockClose = jest.fn().mockImplementation(callback => {
      callback();
    });
    
    (authServer as any).httpServer = {
      close: mockClose
    };
    
    await authServer.stop();
    
    expect(mockClose).toHaveBeenCalled();
    expect((authServer as any).server).toBeNull();
    expect((authServer as any).httpServer).toBeNull();
  });
});