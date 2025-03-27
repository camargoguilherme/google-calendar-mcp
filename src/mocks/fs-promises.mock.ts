let mockFiles: Record<string, string> = {};

export const mockFsPromises = {
  readFile: jest.fn().mockImplementation((path: string) => {
    if (mockFiles[path]) {
      return Promise.resolve(mockFiles[path]);
    }
    
    const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
    (error as any).code = 'ENOENT';
    return Promise.reject(error);
  }),
  
  writeFile: jest.fn().mockImplementation((path: string, content: string, options?: any) => {
    mockFiles[path] = content;
    return Promise.resolve();
  }),
  
  access: jest.fn().mockImplementation((path: string) => {
    if (mockFiles[path]) {
      return Promise.resolve();
    }
    
    const error = new Error(`ENOENT: no such file or directory, access '${path}'`);
    (error as any).code = 'ENOENT';
    return Promise.reject(error);
  }),
  
  reset() {
    mockFiles = {};
    this.readFile.mockClear();
    this.writeFile.mockClear();
    this.access.mockClear();
  },
  
  setupMockFile(path: string, content: string) {
    mockFiles[path] = content;
  }
};