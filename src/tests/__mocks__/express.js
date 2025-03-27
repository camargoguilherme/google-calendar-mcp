// Mock express
const mockApp = {
  get: jest.fn(),
  listen: jest.fn().mockImplementation((port, callback) => {
    if (callback) callback();
    return mockHttpServer;
  })
};

const mockHttpServer = {
  on: jest.fn(),
  close: jest.fn().mockImplementation(callback => {
    if (callback) callback();
    return Promise.resolve();
  })
};

const express = jest.fn().mockReturnValue(mockApp);

export default express;