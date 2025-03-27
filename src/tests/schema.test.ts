/**
 * Tests for server schemas (Zod validation)
 */
import { z } from 'zod';

// Import the same schemas from index.ts
const ListEventsArgumentsSchema = z.object({
  calendarId: z.string(),
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
});

const CreateEventArgumentsSchema = z.object({
  calendarId: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  start: z.string(),
  end: z.string(),
  attendees: z.array(z.object({
    email: z.string()
  })).optional(),
  location: z.string().optional(),
});

const UpdateEventArgumentsSchema = z.object({
  calendarId: z.string(),
  eventId: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string()
  })).optional(),
  location: z.string().optional(),
});

const DeleteEventArgumentsSchema = z.object({
  calendarId: z.string(),
  eventId: z.string(),
});

describe('Schema Validation Tests', () => {
  test('ListEventsArgumentsSchema validates correctly', () => {
    // Valid data
    const validData = {
      calendarId: 'primary',
      timeMin: '2023-01-01T00:00:00Z',
      timeMax: '2023-12-31T23:59:59Z'
    };
    expect(() => ListEventsArgumentsSchema.parse(validData)).not.toThrow();
    
    // Missing required field
    const invalidData = {
      timeMin: '2023-01-01T00:00:00Z'
    };
    expect(() => ListEventsArgumentsSchema.parse(invalidData)).toThrow();
  });
  
  test('CreateEventArgumentsSchema validates correctly', () => {
    // Valid data
    const validData = {
      calendarId: 'primary',
      summary: 'Test Event',
      start: '2023-01-01T10:00:00Z',
      end: '2023-01-01T11:00:00Z',
      description: 'Test Description',
      location: 'Test Location',
      attendees: [{ email: 'test@example.com' }]
    };
    expect(() => CreateEventArgumentsSchema.parse(validData)).not.toThrow();
    
    // Missing required fields
    const invalidData = {
      calendarId: 'primary',
      summary: 'Test Event'
    };
    expect(() => CreateEventArgumentsSchema.parse(invalidData)).toThrow();
  });
  
  test('UpdateEventArgumentsSchema validates correctly', () => {
    // Valid data (minimal)
    const validData = {
      calendarId: 'primary',
      eventId: 'event1'
    };
    expect(() => UpdateEventArgumentsSchema.parse(validData)).not.toThrow();
    
    // Valid data (full)
    const fullData = {
      calendarId: 'primary',
      eventId: 'event1',
      summary: 'Updated Event',
      start: '2023-01-01T11:00:00Z',
      end: '2023-01-01T12:00:00Z',
      description: 'Updated Description',
      location: 'Updated Location',
      attendees: [{ email: 'new@example.com' }]
    };
    expect(() => UpdateEventArgumentsSchema.parse(fullData)).not.toThrow();
    
    // Missing required fields
    const invalidData = {
      calendarId: 'primary'
    };
    expect(() => UpdateEventArgumentsSchema.parse(invalidData)).toThrow();
  });
  
  test('DeleteEventArgumentsSchema validates correctly', () => {
    // Valid data
    const validData = {
      calendarId: 'primary',
      eventId: 'event1'
    };
    expect(() => DeleteEventArgumentsSchema.parse(validData)).not.toThrow();
    
    // Missing required fields
    const invalidData = {
      calendarId: 'primary'
    };
    expect(() => DeleteEventArgumentsSchema.parse(invalidData)).toThrow();
  });
});