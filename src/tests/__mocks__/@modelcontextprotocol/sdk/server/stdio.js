// Mock StdioServerTransport

export class StdioServerTransport {
  constructor() {
    // Mock implementation
  }
  
  onRequest(callback) {
    this.requestCallback = callback;
  }
  
  onResponse(callback) {
    this.responseCallback = callback;
  }
  
  send(message) {
    // Mock sending message
  }
  
  close() {
    // Mock closing transport
  }
}