// index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { google } from 'googleapis';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

import {
  CalendarListEntry,
  CreateEventArgumentsSchema,
  DeleteEventArgumentsSchema,
  ListEventsArgumentsSchema,
  UpdateEventArgumentsSchema
} from "./mcp/schemas.js";
import { list_tools } from "./mcp/config-parameters.js";
import { mcpUseSSE } from "./config/variables.js";
import { initializeGoogleClient } from "./config/utils.js";

let app: Express;
let client: any = null;
let tokenManager: any = null;

const server = new Server(
  {
    name: "google-calendar",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log('Listing Tools');
  return {
    tools: list_tools
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.log('Calling Tools');
  try {
    if (!client || !tokenManager) {
      const initialized = await initializeGoogleClient(app);
      client = initialized.client;
      tokenManager = initialized.tokenManager;
    }

    if (!client) {
      throw new Error("Google client not initialized");
    }

    if (tokenManager && (!await tokenManager.validateTokens())) {
      const authMessage = `Authentication required. Please visit http://localhost:${process.env.PORT || 3001} to authenticate with Google Calendar.`;
      throw new Error(authMessage);
    }

    console.log('Service Account client initialized');

    const calendar = google.calendar({ version: 'v3', auth: client });
    const { name, arguments: args } = request.params;

    console.log('Calling Tool name:', name);

    switch (name) {
      case "list-calendars": {
        try {
          const response = await calendar.calendarList.list();
          const calendars = response.data.items || [];
          console.log('List Calendars:', calendars);
          return {
            content: [{
              type: "text",
              text: calendars.map((cal: CalendarListEntry) => `${cal.summary || 'Untitled'} (${cal.id || 'no-id'})`).join('\n')
            }]
          };
        } catch (error: any) {
          console.error('Error listing calendars:', error);
          return {
            content: [{
              type: "text",
              text: `Error listing calendars: ${error.message}`
            }]
          };
        }

      }
      case "list-events": {
        try {
          const validArgs = ListEventsArgumentsSchema.parse(args);
          const response = await calendar.events.list({
            calendarId: validArgs.calendarId,
            timeMin: validArgs.timeMin,
            timeMax: validArgs.timeMax,
            singleEvents: true,
            orderBy: 'startTime',
          });
          const events = response.data.items || [];
          console.log('List Events:', events);
          return {
            content: [{
              type: "text",
              text: events.map((event) => {
                const attendeeList = event.attendees ? `\nAttendees: ${event.attendees.map((a) => `${a.email || 'no-email'} (${a.responseStatus || 'unknown'})`).join(', ')}` : '';
                const locationInfo = event.location ? `\nLocation: ${event.location}` : '';
                const colorInfo = event.colorId ? `\nColor ID: ${event.colorId}` : '';
                const reminderInfo = event.reminders ? `\nReminders: ${event.reminders.useDefault ? 'Using default' : (event.reminders.overrides || []).map(r => `${r.method} ${r.minutes} minutes before`).join(', ') || 'None'}` : '';
                return `${event.summary || 'Untitled'} (${event.id || 'no-id'})${locationInfo}\nStart: ${event.start?.dateTime || event.start?.date || 'unspecified'}\nEnd: ${event.end?.dateTime || event.end?.date || 'unspecified'}${attendeeList}${colorInfo}${reminderInfo}\n`;
              }).join('\n')
            }]
          };
        } catch (error: any) {
          console.error('Error listing calendars:', error);
          return {
            content: [{
              type: "text",
              text: `Error listing calendars: ${error.message}`
            }]
          };
        }
      }
      case "list-colors": {
        try {
          const response = await calendar.colors.get();
          const colors = response.data.event || {};
          const colorList = Object.entries(colors).map(([id, colorInfo]: [string, any]) => `Color ID: ${id} - ${colorInfo.background} (background) / ${colorInfo.foreground} (foreground)`).join('\n');
          console.log('List Colors:', colorList);
          return {
            content: [{
              type: "text",
              text: `Available event colors:\n${colorList}`
            }]
          };
        } catch (error: any) {
          console.error('Error listing colors:', error);
          return {
            content: [{
              type: "text",
              text: `Error listing colors: ${error.message}`
            }]
          };
        }
      }
      case "create-event": {
        try {
          const validArgs = CreateEventArgumentsSchema.parse(args);
          const event = await calendar.events.insert({
            calendarId: validArgs.calendarId,
            requestBody: {
              summary: validArgs.summary,
              description: validArgs.description,
              start: { dateTime: validArgs.start },
              end: { dateTime: validArgs.end },
              attendees: validArgs.attendees,
              location: validArgs.location,
              colorId: validArgs.colorId,
              reminders: validArgs.reminders,
            },
          }).then(response => response.data);
          return {
            content: [{
              type: "text",
              text: `Event created: ${event.summary} (${event.id})`
            }]
          };

        } catch (error: any) {
          console.error('Error create event:', error);
          return {
            content: [{
              type: "text",
              text: `Error create event: ${error.message}`
            }]
          };
        }
      }
      case "update-event": {
        try {
          const validArgs = UpdateEventArgumentsSchema.parse(args);
          const event = await calendar.events.patch({
            calendarId: validArgs.calendarId,
            eventId: validArgs.eventId,
            requestBody: {
              summary: validArgs.summary,
              description: validArgs.description,
              start: validArgs.start ? { dateTime: validArgs.start } : undefined,
              end: validArgs.end ? { dateTime: validArgs.end } : undefined,
              attendees: validArgs.attendees,
              location: validArgs.location,
              colorId: validArgs.colorId,
              reminders: validArgs.reminders,
            },
          }).then(response => response.data);
          return {
            content: [{
              type: "text",
              text: `Event updated: ${event.summary} (${event.id})`
            }]
          };
        } catch (error: any) {
          console.error('Error update evennt:', error);
          return {
            content: [{
              type: "text",
              text: `Error update evennt: ${error.message}`
            }]
          };
        }
      }
      case "delete-event": {
        try {
          const validArgs = DeleteEventArgumentsSchema.parse(args);
          await calendar.events.delete({
            calendarId: validArgs.calendarId,
            eventId: validArgs.eventId,
          });
          return {
            content: [{
              type: "text",
              text: `Event deleted successfully`
            }]
          };
        } catch (error: any) {
          console.error('Error delete event:', error);
          return {
            content: [{
              type: "text",
              text: `Error delete event: ${error.message}`
            }]
          };
        }
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    throw error;
  }
});

async function startStdioTransport() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.info("Google Calendar MCP Server running on stdio");
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

async function startSseTransport() {
  let transport: SSEServerTransport;

  console.info("Google Calendar MCP Server running on SSE");

  app.get("/sse", /*express.raw({ type: 'application/json' }),*/ async (req: Request, res: Response) => {
    console.log("Received connection");
    try {
      transport = new SSEServerTransport("/message", res);
      await server.connect(transport);

      server.onclose = async () => {
        await server.close();
        process.exit(0);
      };
    } catch (error) {
      console.error("Error in SSE connection:", error);
      res.writeHead(500);
      res.end("Internal Server Error");
      return;

    }
  });

  app.post("/message", /*express.raw({ type: 'application/json' }),*/ async (req: Request, res: Response) => {
    console.log("Received message");
    console.log("Request body:", req.body);
    console.log("Request params:", req.params);
    console.log("Request query:", req.query);

    if (!transport) {
      console.error("Transport not initialized");
      res.writeHead(500);
      res.end("Transport not initialized");
      return;
    }
    try {
      await transport.handlePostMessage(req, res);
    } catch (error) {
      console.error("Error handling message:", error);
      res.writeHead(500);
      res.end("Internal Server Error");
      return;
    }
  });
}

async function main() {
  app = express();
  app.use(cors());
  const jsonMiddleware = express.json();
  app.use((req, res, next) => { if (req.path === '/message') { next(); } else { jsonMiddleware(req, res, next); } });

  if (mcpUseSSE) {
    await startSseTransport();
  } else {
    await startStdioTransport();
  }

  const PORT = Number(process.env.PORT || '3001');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
