const reminders_input_property = {
  type: "object",
  description: "Reminder settings for the event",
  properties: {
    useDefault: {
      type: "boolean",
      description: "Whether to use the default reminders",
    },
    overrides: {
      type: "array",
      description: "Custom reminders (uses popup notifications by default unless email is specified)",
      items: {
        type: "object",
        properties: {
          method: {
            type: "string",
            enum: ["email", "popup"],
            description: "Reminder method (defaults to popup unless email is specified)",
            default: "popup"
          },
          minutes: {
            type: "number",
            description: "Minutes before the event to trigger the reminder",
          }
        },
        required: ["minutes"]
      }
    }
  },
  required: ["useDefault"]
}

export const list_tools = [
  {
    name: "list-calendars",
    description: "List all available calendars",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list-events",
    description: "List events from a calendar",
    inputSchema: {
      type: "object",
      properties: {
        calendarId: {
          type: "string",
          description: "ID of the calendar to list events from",
        },
        timeMin: {
          type: "string",
          description: "Start time in ISO format (optional)",
        },
        timeMax: {
          type: "string",
          description: "End time in ISO format (optional)",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of events to return",
        },
      },
      required: ["calendarId"],
    },
  },
  {
    name: "list-colors",
    description: "List available color IDs for calendar events",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "create-event",
    description: "Create a new calendar event",
    inputSchema: {
      type: "object",
      properties: {
        calendarId: {
          type: "string",
          description: "ID of the calendar to create event in",
        },
        summary: {
          type: "string",
          description: "Title of the event",
        },
        description: {
          type: "string",
          description: "Description of the event",
        },
        start: {
          type: "string",
          description: "Event start time (ISO string)",
        },
        end: {
          type: "string",
          description: "Event end time (ISO string)",
        },
        location: {
          type: "string",
          description: "Location of the event",
        },
        attendees: {
          type: "array",
          description: "List of attendees",
          items: {
            type: "object",
            properties: {
              email: {
                type: "string",
                description: "Email address of the attendee"
              }
            },
            required: ["email"]
          }
        },
        colorId: {
          type: "string",
          description: "Color ID for the event",
        },
        reminders: reminders_input_property
      },
      required: ["calendarId", "summary", "start", "end"],
    },
  },
  {
    name: "update-event",
    description: "Update an existing calendar event",
    inputSchema: {
      type: "object",
      properties: {
        calendarId: {
          type: "string",
          description: "ID of the calendar containing the event",
        },
        eventId: {
          type: "string",
          description: "ID of the event to update",
        },
        summary: {
          type: "string",
          description: "New title of the event",
        },
        description: {
          type: "string",
          description: "New description of the event",
        },
        start: {
          type: "string",
          description: "New start time (ISO string)",
        },
        end: {
          type: "string",
          description: "New end time (ISO string)",
        },
        location: {
          type: "string",
          description: "New location of the event",
        },
        colorId: {
          type: "string",
          description: "New color ID for the event",
        },
        attendees: {
          type: "array",
          description: "List of attendees",
          items: {
            type: "object",
            properties: {
              email: {
                type: "string",
                description: "Email address of the attendee"
              }
            },
            required: ["email"]
          }
        },
        reminders: {
          ...reminders_input_property,
          description: "New reminder settings for the event",
        }
      },
      required: ["calendarId", "eventId"],
    },
  },
  {
    name: "delete-event",
    description: "Delete a calendar event",
    inputSchema: {
      type: "object",
      properties: {
        calendarId: {
          type: "string",
          description: "ID of the calendar containing the event",
        },
        eventId: {
          type: "string",
          description: "ID of the event to delete",
        },
      },
      required: ["calendarId", "eventId"],
    },
  },
];
