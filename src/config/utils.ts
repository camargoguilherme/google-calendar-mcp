import * as fs from 'fs/promises';
import * as path from 'path';
import { Express } from 'express';

import {
  googleOauthClientId,
  googleOauthClientSecret,
  keyJson,
  keyPath,
  mcpAuthMethod,
  mcpHost,
  oauthKeyPath
} from './variables.js';
import { JWT, OAuth2Client } from 'google-auth-library';
import { TokenManager } from '../auth/token-manager.js';
import { AuthServer } from '../auth/auth-server.js';

let oauth2Client: OAuth2Client;
let tokenManager: TokenManager;
let authServer: AuthServer;

async function writeGoogleServiceAccountKeyFile(): Promise<void> {
  console.info('Writing Google Service Account key file...');
  try {
    await fs.access(keyPath);
  } catch {
    if (keyJson) {
      const filename = keyPath.split('/').pop();
      await fs.writeFile(keyPath, keyJson, { mode: 0o600 });
      console.log(`File ${filename} created`);
    } else {
      throw new Error('GCP_SERVICE_ACCOUNT_JSON não definido e o arquivo de chave não existe');
    }
  }
}

async function writeGoogleOauthKeyFile(): Promise<void> {
  try {
    await fs.access(oauthKeyPath);
  } catch {
    let message = '';

    if (!googleOauthClientId)
      message += 'GCP_OAUTH_CLIENT_ID não definido\n';
    if (!googleOauthClientSecret)
      message += 'GCP_OAUTH_CLIENT_SECRET não definido\n';
    if (message) {
      throw new Error(message);
    }

    const oauthKeyJson = JSON.stringify({
      installed: {
        client_id: googleOauthClientId,
        client_secret: googleOauthClientSecret,
        redirect_uris: [`${mcpHost}/oauth2/callback`],
      }
    }, null, 2);

    await fs.writeFile(oauthKeyPath, oauthKeyJson, { mode: 0o600 });
    console.log(`${oauthKeyPath.split('/').pop()} criado em ${oauthKeyPath}`);
  }
}


// Initialize Service Account client
async function initializeServiceAccountClient() {
  await writeGoogleServiceAccountKeyFile();
  const keyFile = await fs.readFile(keyPath, 'utf-8');
  const key = JSON.parse(keyFile);
  const scopes = ['https://www.googleapis.com/auth/calendar'];

  console.log('Initializing Service Account client...');

  try {
    const client = new JWT({
      email: key.client_email,
      key: key.private_key.replace(/\\n/g, '\n'),
      scopes,
    });

    await client.authorize();
    return {
      client,
      tokenManager: null,
      authServer: null,
    };
  } catch (error) {
    console.error();
    throw new Error(`Failed to initialize Service Account client: \n${error}`);
  }
}

// Initialize OAuth2 client
async function initializeOAuth2Client(server: Express) {
  try {
    await writeGoogleOauthKeyFile();
    const keysContent = await fs.readFile(oauthKeyPath, 'utf-8');
    const keys = JSON.parse(keysContent);

    const { client_id, client_secret, redirect_uris } = keys.installed;

    oauth2Client = new OAuth2Client({
      clientId: client_id,
      clientSecret: client_secret,
      redirectUri: redirect_uris[0]
    });

    tokenManager = new TokenManager(oauth2Client);
    authServer = new AuthServer(oauth2Client, server);

    // Start auth server if needed
    if (!await tokenManager.loadSavedTokens()) {
      console.log('No valid tokens found, starting auth server...');
      const success = await authServer.start();
      if (!success) {
        console.error('Failed to start auth server');
        process.exit(1);
      }
    }
    return {
      client: oauth2Client,
      tokenManager,
      authServer,
    };
  } catch (error) {
    console.error("Error loading OAuth keys:", error);
    throw error;
  }
}

export async function initializeGoogleClient(server: Express) {
  switch (mcpAuthMethod) {
    case 'service-account':
      return initializeServiceAccountClient();
    case 'oauth2':
      return initializeOAuth2Client(server);
    default:
      throw new Error(`Authentication method supported: 'service-account' or 'oauth2'`);
  }
}


export async function cleanup() {
  console.log('Cleaning up...');
  if (tokenManager) {
    tokenManager.clearTokens();
  }
  process.exit(0);
}
