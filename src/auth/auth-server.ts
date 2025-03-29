import * as fs from 'fs/promises';
import * as path from 'path';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import open from 'open';
import { Express } from 'express';
import { TokenManager } from './token-manager.js';
import { mcpHost } from '../config/variables.js';

export class AuthServer {
  private server: express.Application | null = null;
  private tokenManager: TokenManager;
  private port: number = parseInt(process.env.PORT ?? '3001', 10);
  private credentials: { client_id: string; client_secret: string } | null = null;

  constructor(private oauth2Client: OAuth2Client, server: Express) {
    this.tokenManager = new TokenManager(oauth2Client);
    this.server = server;
  }

  private getKeysFilePath(): string {
    return path.join(process.cwd(), 'gcp-oauth.keys.json');
  }

  private async loadCredentials(): Promise<void> {
    const content = await fs.readFile(this.getKeysFilePath(), 'utf-8');
    const keys = JSON.parse(content);
    this.credentials = {
      client_id: keys.installed.client_id,
      client_secret: keys.installed.client_secret
    };
  }

  private createOAuthClient(): OAuth2Client {
    if (!this.credentials) {
      throw new Error('Credentials not loaded');
    }
    return new OAuth2Client(
      this.credentials.client_id,
      this.credentials.client_secret,
      `${mcpHost}/oauth2/callback`
    );
  }

  private async startServer(): Promise<boolean> {
    try {
      // Create a new OAuth client
      this.oauth2Client = this.createOAuthClient();

      // Handle OAuth callback
      this.server!.get('/oauth2/callback', async (req, res) => {
        try {
          const code = req.query.code as string;
          if (!code) {
            throw new Error('No code received');
          }

          const { tokens } = await this.oauth2Client.getToken(code);
          await this.tokenManager.saveTokens(tokens);

          res.send('Authentication successful! You can close this window.');
          return true;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error('Error in OAuth callback:', errorMessage);
          res.status(500).send('Authentication failed. Please try again.');
          return false;
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to start server on any available port');
      return false;
    }
  }

  public async start(): Promise<boolean> {
    console.log('Starting auth server...');

    try {
      const tokens = await this.tokenManager.loadSavedTokens();
      if (tokens) {
        console.log('Valid tokens found, no need to start auth server');
        return true;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.log('No valid tokens found:', errorMessage);
    }

    try {
      await this.loadCredentials();

      const serverStarted = await this.startServer();
      if (!serverStarted) {
        console.error('Failed to start auth server');
        return false;
      }

      console.log('Using redirect URI:', `${mcpHost}/oauth2/callback`);

      const authorizeUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar']
      });

      console.log(`Opening browser for authentication on port ${this.port}...`);
      console.log(`Url to authorize ${authorizeUrl}`);
      await open(authorizeUrl);

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Authentication failed:', errorMessage);
      return false;
    }
  }
}
