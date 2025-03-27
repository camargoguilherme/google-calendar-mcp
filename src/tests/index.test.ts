import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createMockOAuth2Client } from '../mocks/oauth-client.mock.js';
import { mockFsPromises } from '../mocks/fs-promises.mock.js';
import { mockGoogleAPIFactory, mockGoogleCalendarAPI } from '../mocks/google-api.mock.js';

// Mock dependencies
jest.mock('fs/promises', () => mockFsPromises);
jest.mock('google-auth-library');
jest.mock('googleapis', () => ({
  google: mockGoogleAPIFactory()
}));

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({}))
}));

// Mock local modules
jest.mock('../auth-server.js', () => ({
  AuthServer: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(true),
    stop: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../token-manager.js', () => ({
  TokenManager: jest.fn().mockImplementation(() => ({
    loadSavedTokens: jest.fn().mockResolvedValue(true),
    validateTokens: jest.fn().mockResolvedValue(true),
    clearTokens: jest.fn()
  }))
}));

describe('MCP Server', () => {
  let server: any;
  let mockOAuth2Client: ReturnType<typeof createMockOAuth2Client>;
  
  beforeEach(() => {
    jest.resetModules();
    mockFsPromises.reset();
    
    // Setup mock OAuth keys file
    const mockKeys = {
      installed: {
        client_id: 'mock-client-id',
        client_secret: 'mock-client-secret',
        redirect_uris: ['http://localhost:3000/oauth2callback']
      }
    };
    
    mockFsPromises.setupMockFile('/mock-path/gcp-oauth.keys.json', JSON.stringify(mockKeys));
    
    // Mock path functions
    jest.mock('path', () => ({
      join: jest.fn().mockReturnValue('/mock-path/gcp-oauth.keys.json'),
      dirname: jest.fn().mockReturnValue('/mock-path'),
      resolve: jest.fn().mockReturnValue('/mock-path/gcp-oauth.keys.json')
    }));
    
    mockOAuth2Client = createMockOAuth2Client();
    
    // Re-import to test with mocks
    jest.isolateModules(() => {
      // Not running the actual server, just checking it initializes correctly
      server = new Server();
    });
  });
  
  test('server should be properly initialized', () => {
    expect(server).toBeDefined();
    expect(Server).toHaveBeenCalled();
  });
  
  test('setRequestHandler should be called for ListToolsRequestSchema', () => {
    expect(server.setRequestHandler).toHaveBeenCalled();
  });
  
  test('list-calendars tool should call Google Calendar API', async () => {
    // Create a mock request handler function
    const mockHandlerFn = server.setRequestHandler.mock.calls.find(
      call => call[0]?.name === 'CallToolRequestSchema'
    )?.[1];
    
    if (!mockHandlerFn) {
      throw new Error('CallToolRequestSchema handler not found');
    }
    
    // Test list-calendars handler
    const result = await mockHandlerFn({
      params: {
        name: 'list-calendars',
        arguments: {}
      }
    });
    
    expect(mockGoogleAPIFactory().calendar).toHaveBeenCalledWith({ 
      version: 'v3', 
      auth: expect.anything() 
    });
    expect(mockGoogleCalendarAPI.calendarList.list).toHaveBeenCalled();
    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('type', 'text');
  });
  
  test('list-events tool should validate arguments and call Google Calendar API', async () => {
    const mockHandlerFn = server.setRequestHandler.mock.calls.find(
      call => call[0]?.name === 'CallToolRequestSchema'
    )?.[1];
    
    if (!mockHandlerFn) {
      throw new Error('CallToolRequestSchema handler not found');
    }
    
    // Test list-events handler
    const result = await mockHandlerFn({
      params: {
        name: 'list-events',
        arguments: {
          calendarId: 'primary',
          timeMin: '2025-01-01T00:00:00Z',
          timeMax: '2025-12-31T23:59:59Z'
        }
      }
    });
    
    expect(mockGoogleCalendarAPI.events.list).toHaveBeenCalledWith({
      calendarId: 'primary',
      timeMin: '2025-01-01T00:00:00Z',
      timeMax: '2025-12-31T23:59:59Z',
      singleEvents: true,
      orderBy: 'startTime',
    });
    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('type', 'text');
  });
  
  test('create-event tool should validate arguments and call Google Calendar API', async () => {
    const mockHandlerFn = server.setRequestHandler.mock.calls.find(
      call => call[0]?.name === 'CallToolRequestSchema'
    )?.[1];
    
    if (!mockHandlerFn) {
      throw new Error('CallToolRequestSchema handler not found');
    }
    
    // Test create-event handler
    const result = await mockHandlerFn({
      params: {
        name: 'create-event',
        arguments: {
          calendarId: 'primary',
          summary: 'Test Event',
          start: '2025-01-01T10:00:00Z',
          end: '2025-01-01T11:00:00Z',
          description: 'Test Description',
          location: 'Test Location',
          attendees: [{ email: 'test@example.com' }]
        }
      }
    });
    
    expect(mockGoogleCalendarAPI.events.insert).toHaveBeenCalledWith({
      calendarId: 'primary',
      requestBody: {
        summary: 'Test Event',
        description: 'Test Description',
        start: { dateTime: '2025-01-01T10:00:00Z' },
        end: { dateTime: '2025-01-01T11:00:00Z' },
        location: 'Test Location',
        attendees: [{ email: 'test@example.com' }]
      }
    });
    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0].text).toContain('Event created');
  });
  
  test('update-event tool should validate arguments and call Google Calendar API', async () => {
    const mockHandlerFn = server.setRequestHandler.mock.calls.find(
      call => call[0]?.name === 'CallToolRequestSchema'
    )?.[1];
    
    if (!mockHandlerFn) {
      throw new Error('CallToolRequestSchema handler not found');
    }
    
    // Test update-event handler
    const result = await mockHandlerFn({
      params: {
        name: 'update-event',
        arguments: {
          calendarId: 'primary',
          eventId: 'event1',
          summary: 'Updated Event',
          start: '2025-01-01T11:00:00Z',
          end: '2025-01-01T12:00:00Z'
        }
      }
    });
    
    expect(mockGoogleCalendarAPI.events.patch).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: 'event1',
      requestBody: {
        summary: 'Updated Event',
        start: { dateTime: '2025-01-01T11:00:00Z' },
        end: { dateTime: '2025-01-01T12:00:00Z' }
      }
    });
    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0].text).toContain('Event updated');
  });
  
  test('delete-event tool should validate arguments and call Google Calendar API', async () => {
    const mockHandlerFn = server.setRequestHandler.mock.calls.find(
      call => call[0]?.name === 'CallToolRequestSchema'
    )?.[1];
    
    if (!mockHandlerFn) {
      throw new Error('CallToolRequestSchema handler not found');
    }
    
    // Test delete-event handler
    const result = await mockHandlerFn({
      params: {
        name: 'delete-event',
        arguments: {
          calendarId: 'primary',
          eventId: 'event1'
        }
      }
    });
    
    expect(mockGoogleCalendarAPI.events.delete).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: 'event1'
    });
    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0].text).toContain('deleted successfully');
  });
});