export const mockGoogleCalendarAPI = {
  calendarList: {
    list: jest.fn().mockResolvedValue({
      data: {
        items: [
          { id: 'calendar1', summary: 'Primary Calendar' },
          { id: 'calendar2', summary: 'Work Calendar' }
        ]
      }
    })
  },
  events: {
    list: jest.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 'event1',
            summary: 'Team Meeting',
            start: { dateTime: '2025-01-01T10:00:00Z' },
            end: { dateTime: '2025-01-01T11:00:00Z' },
            location: 'Conference Room A',
            attendees: [
              { email: 'person1@example.com', responseStatus: 'accepted' },
              { email: 'person2@example.com', responseStatus: 'tentative' }
            ]
          },
          {
            id: 'event2',
            summary: 'Project Review',
            start: { dateTime: '2025-01-02T14:00:00Z' },
            end: { dateTime: '2025-01-02T15:00:00Z' }
          }
        ]
      }
    }),
    insert: jest.fn().mockImplementation(({ requestBody }) => {
      return Promise.resolve({
        data: {
          id: 'new-event-id',
          ...requestBody
        }
      });
    }),
    patch: jest.fn().mockImplementation(({ eventId, requestBody }) => {
      return Promise.resolve({
        data: {
          id: eventId,
          ...requestBody
        }
      });
    }),
    delete: jest.fn().mockResolvedValue({})
  }
};

export const mockGoogleAPIFactory = () => {
  return {
    calendar: jest.fn().mockReturnValue(mockGoogleCalendarAPI)
  };
};