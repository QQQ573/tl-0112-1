FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY server.js ./

EXPOSE 8080

CMD ["npm", "start"]
