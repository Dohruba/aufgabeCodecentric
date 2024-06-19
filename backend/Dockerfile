FROM node:21.2.0-alpine as build

WORKDIR /usr/src/app/backend

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .

EXPOSE 8000

ENV NODE_ENV=production

CMD ["npx", "ts-node", "./index.ts", "true"]