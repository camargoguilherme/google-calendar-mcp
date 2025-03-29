import * as path from 'path';
import { fileURLToPath } from 'url';

// Utiliza variáveis de ambiente para caminho e conteúdo da chave
export const defaultGoogleServiceAccountKeyPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../credentials/gcp-service-account.json');
export const keyPath = process.env.GCP_KEY_PATH || defaultGoogleServiceAccountKeyPath;
export const keyJson = process.env.GCP_SERVICE_ACCOUNT_JSON;

export const defaultGoogleOauthKeyPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../credentials/gcp-oauth.keys.json');
export const oauthKeyPath = process.env.GCP_OAUTH_KEY_PATH || defaultGoogleOauthKeyPath;
export const googleOauthClientId = process.env.GCP_OAUTH_CLIENT_ID;
export const googleOauthClientSecret = process.env.GCP_OAUTH_CLIENT_SECRET;

export const mcpHost = process.env.MCP_HOST || `http://localhost:${process.env.PORT || 3001}`;
export const mcpUseSSE = process.env.MCP_USE_SSE === 'true';
export const mcpAuthMethod = process.env.MCP_AUTH_METHOD || 'oauth2';
