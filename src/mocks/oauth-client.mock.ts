import { OAuth2Client } from 'google-auth-library';

export class MockOAuth2Client {
  credentials: any = {};
  listeners: Record<string, Array<(tokens: any) => void>> = {};
  
  constructor(public options: any = {}) {}
  
  setCredentials(credentials: any): void {
    this.credentials = credentials;
  }
  
  on(event: string, callback: (tokens: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
  
  async refreshAccessToken(): Promise<{ credentials: any }> {
    const newTokens = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expiry_date: Date.now() + 3600 * 1000,
    };
    
    return { credentials: newTokens };
  }
  
  async getToken(code: string): Promise<{ tokens: any }> {
    const tokens = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expiry_date: Date.now() + 3600 * 1000,
    };
    
    return { tokens };
  }
  
  generateAuthUrl(options: any): string {
    return 'https://accounts.google.com/o/oauth2/auth?mock=true';
  }
}

export const createMockOAuth2Client = () => {
  return new MockOAuth2Client() as unknown as OAuth2Client;
};