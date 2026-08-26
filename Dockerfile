FROM node:20-alpine

WORKDIR /app

# Copiar package.json (sin usar npm ci para evitar conflictos de lock file)
COPY package*.json ./

RUN npm install

# Copiar el resto del código
COPY . .

# Build de Vite
RUN npm run build

# Servidor para servir el dist
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
