FROM node:latest 

# Create App Directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install Dependencies
COPY package.json /usr/src/app/package.json
COPY index.js /usr/src/app/index.js
COPY .env /usr/src/app/.env
COPY messages.json /usr/src/app/messages.json
RUN npm install dotenv express body-parser

ARG certPath
ARG portNumber

RUN mkdir -p ${certPath}

EXPOSE ${portNumber}

CMD node index.js

