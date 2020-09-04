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

RUN mkdir -p /etc/letsencrypt/live/test.cookierecipes.ml/ 
COPY privkey.pem /etc/letsencrypt/live/test.cookierecipes.ml/privkey.pem
COPY cert.pem /etc/letsencrypt/live/test.cookierecipes.ml/cert.pem
COPY fullchain.pem /etc/letsencrypt/live/test.cookierecipes.ml/fullchain.pem

EXPOSE 3001 

CMD node index.js
