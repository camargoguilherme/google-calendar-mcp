# Usa imagem Node.js leve
# STAGE 1: Build da aplicação
FROM node:20-alpine3.20 as builder
WORKDIR /mcp

COPY package*.json ./ 

RUN npm install --no-cache

COPY . .

RUN npm run build

# STAGE 2: Imagem final
FROM node:20-alpine3.20

# Cria diretório de trabalho
WORKDIR /mcp

# Copia arquivos de dependência e instala pacotes
COPY package*.json ./
RUN npm install --production

# Copia todo o restante do projeto
COPY . .

# Variáveis padrão (podem ser sobrescritas)
ENV PORT=3001
ENV MCP_USE_SSE=true

# Compila TypeScript se necessário (descomente se for o caso)
# RUN npm run build

# Expõe a porta do servidor SSE
EXPOSE 3001

# Inicia o servidor MCP
CMD ["node", "build/index.js"]
