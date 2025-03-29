// index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { google } from 'googleapis';
import express, { Express } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
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
  return {
    tools: list_tools
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
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

    console.log('Service Account client initialized')

    const calendar = google.calendar({ version: 'v3', auth: client });
    const { name, arguments: args } = request.params;

    switch (name) {
      case "list-calendars": {
        const response = await calendar.calendarList.list();
        const calendars = response.data.items || [];
        return {
          content: [{
            type: "text",
            text: calendars.map((cal: CalendarListEntry) => `${cal.summary || 'Untitled'} (${cal.id || 'no-id'})`).join('\n')
          }]
        };
      }
      case "list-events": {
        const validArgs = ListEventsArgumentsSchema.parse(args);
        const response = await calendar.events.list({
          calendarId: validArgs.calendarId,
          timeMin: validArgs.timeMin,
          timeMax: validArgs.timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });
        const events = response.data.items || [];
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
      }
      case "list-colors": {
        const response = await calendar.colors.get();
        const colors = response.data.event || {};
        const colorList = Object.entries(colors).map(([id, colorInfo]: [string, any]) => `Color ID: ${id} - ${colorInfo.background} (background) / ${colorInfo.foreground} (foreground)`).join('\n');
        return {
          content: [{
            type: "text",
            text: `Available event colors:\n${colorList}`
          }]
        };
      }
      case "create-event": {
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
      }
      case "update-event": {
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
      }
      case "delete-event": {
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

  app.get("/sse", async (req: IncomingMessage, res: ServerResponse) => {
    console.log("Received connection");
    transport = new SSEServerTransport("/message", res);
    await server.connect(transport);

    server.onclose = async () => {
      await server.close();
      process.exit(0);
    };
  });

  app.post("/message", async (req: IncomingMessage, res: ServerResponse) => {
    console.log("Received message");

    if (!transport) {
      console.error("Transport not initialized");
      res.writeHead(500);
      res.end("Transport not initialized");
      return;
    }

    await transport.handlePostMessage(req, res);
  });
}

async function main() {
  app = express();

  if (mcpUseSSE) {
    await startSseTransport();
  } else {
    await startStdioTransport();
  }

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
