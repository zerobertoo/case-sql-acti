FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

# O correto seria usar `npm ci`, mas para facilitar usaremos `npm install` aqui.
RUN npm install

COPY . .

USER node

EXPOSE 3000

CMD ["node", "index.js"]
