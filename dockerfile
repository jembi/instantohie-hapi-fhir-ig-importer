FROM jembi/instantohie-config-importer:latest

WORKDIR /usr/src/importer

COPY package*.json ./

RUN npm ci --only=production

COPY . .

CMD wait-on -t 60000 http-get://${HAPI_FHIR_BASE_URL} && node index.js