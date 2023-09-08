FROM node:latest

WORKDIR /app

COPY package*.json ./

RUN yarn install

COPY . .

EXPOSE 9000

RUN yarn build

CMD ["yarn", "start"]