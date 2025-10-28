FROM node:18-alpine

# Diretório de trabalho
WORKDIR /usr/src/app

# Instala apenas dependências necessárias para produção
COPY package*.json ./
RUN npm ci --omit=dev

# Copia restante do código
COPY . .

# Configuração
ENV NODE_ENV=production
EXPOSE 3100

# Inicializa a aplicação
CMD ["npm", "start"]