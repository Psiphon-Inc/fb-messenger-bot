FROM node:14 

# Create App Directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install Dependencies
COPY package.json /usr/src/app/package.json
COPY package-lock.json /usr/src/app/package-lock.json
COPY index.js /usr/src/app/index.js
COPY .env /usr/src/app/.env
COPY messages.json /usr/src/app/messages.json
RUN npm ci

ARG CERTPATH
ARG PORTNUMBER

RUN mkdir -p ${CERTPATH}

EXPOSE ${PORTNUMBER}

CMD node index.js

