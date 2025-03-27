// Mock MCP Server

export class Server {
  constructor(serverInfo, options) {
    this.serverInfo = serverInfo;
    this.options = options;
    this.handlers = new Map();
  }
  
  setRequestHandler(schema, handler) {
    this.handlers.set(schema, handler);
    return this;
  }
  
  async connect(transport) {
    return Promise.resolve();
  }
  
  // For testing - get a handler by name
  getHandler(name) {
    for (const [schema, handler] of this.handlers.entries()) {
      if (schema.name === name) {
        return handler;
      }
    }
    return null;
  }
}