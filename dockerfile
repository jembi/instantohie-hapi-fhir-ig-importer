FROM jembi/instantohie-config-importer:latest

WORKDIR /usr/src/importer

COPY package*.json ./

RUN npm ci --only=production

COPY . .