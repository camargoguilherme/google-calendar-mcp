/**
 * Simplified MCP server tests
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { google } from 'googleapis';
import * as fs from 'fs/promises';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('googleapis');
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('@modelcontextprotocol/sdk/types.js');

// These variables would be initialized in the actual server
let server;
let oauth2Client;
let tokenManager;
let authServer;

// Mock token manager and auth server
const mockTokenManager = {
  loadSavedTokens: jest.fn().mockResolvedValue(true),
  validateTokens: jest.fn().mockResolvedValue(true),
  clearTokens: jest.fn()
};

const mockAuthServer = {
  start: jest.fn().mockResolvedValue(true),
  stop: jest.fn().mockResolvedValue(undefined)
};

// Import these after mocking
import * as indexModule from '../index.js';

describe('MCP Server Simplified Tests', () => {
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup token manager mock
    tokenManager = mockTokenManager;
    
    // Setup auth server mock
    authServer = mockAuthServer;
    
    // Create a new server instance
    server = new Server(
      { name: 'google-calendar', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    // Mock OAuth2Client
    oauth2Client = {
      credentials: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expiry_date: Date.now() + 3600 * 1000
      },
      on: jest.fn()
    };
  });
  
  test('server should be initialized with correct info', () => {
    expect(server.serverInfo).toEqual({ name: 'google-calendar', version: '1.0.0' });
  });
  
  test('server should register listTools handler', () => {
    expect(server.setRequestHandler).toHaveBeenCalledWith(
      ListToolsRequestSchema,
      expect.any(Function)
    );
  });
  
  test('server should register callTool handler', () => {
    expect(server.setRequestHandler).toHaveBeenCalledWith(
      CallToolRequestSchema,
      expect.any(Function)
    );
  });
  
  test('listTools handler should return available tools', async () => {
    // Get the handler
    const listToolsHandler = server.setRequestHandler.mock.calls.find(
      call => call[0] === ListToolsRequestSchema
    )[1];
    
    // Call the handler
    const result = await listToolsHandler();
    
    // Verify the result
    expect(result).toHaveProperty('tools');
    expect(Array.isArray(result.tools)).toBe(true);
  });
  
  test('callTool should handle list-calendars', async () => {
    // Get the handler
    const callToolHandler = server.setRequestHandler.mock.calls.find(
      call => call[0] === CallToolRequestSchema
    )[1];
    
    // Call the handler with list-calendars
    const result = await callToolHandler({
      params: {
        name: 'list-calendars',
        arguments: {}
      }
    });
    
    // Verify Google Calendar API was called
    expect(google.calendar).toHaveBeenCalled();
    expect(google.calendar().calendarList.list).toHaveBeenCalled();
    
    // Verify result format
    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('type', 'text');
  });
});