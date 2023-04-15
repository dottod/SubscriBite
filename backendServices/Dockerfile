FROM node:alpine

WORKDIR /app

RUN apk upgrade
RUN apk add curl

COPY package.json ./
RUN npm install


COPY ./ ./

CMD ["npm", "start"]