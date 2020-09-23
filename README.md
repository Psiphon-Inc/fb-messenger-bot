# fb-messenger-bot
This project is based on Facebook's Messenger Bot project and was initially setup following this guide https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup, information from that guide was used as a starting point to create a dockerized and customized version of the Facebook Messenger Bot. 

## Prequisites and Installation 
In order to run this container you'll need docker installed and all dependencies be provided as described in the following sections.

### Install Docker

Check the official [Docker documentation](https://docs.docker.com/engine/) for information how to install Docker on your operating system. And then install Docker and supporting tools.

* [Windows](https://docs.docker.com/windows/started)
* [OS X](https://docs.docker.com/mac/started/)
* [Linux](https://docs.docker.com/linux/started/)

### Clone this repository

Clone this repository to your server. 


### Create .env File

Certain variables which are considered secret are not set in these files and are represented by variables. You will need to create a .env file in your project directory and define the following variables: 

```
PRIVKEYPATH
CERTPEMPATH
FULLCHAINPEMPATH
PORT
CERTPATH
ACCESSTOKEN
WEBTOKEN
```
You may not know yet what to put for these variables, that will be defined in the next steps. 


### Facebook Page and Facebook App 

You will need a Facebook Page and a Facebook App. Information on obtaining these can be found in Facebook's documentation [here](https://developers.facebook.com/docs/messenger-platform/getting-started/app-setup). 

You will get your `ACCESSTOKEN` from Facebook. Your Verify Token or `WEBTOKEN` is needed in this step as well, the Verify Token is explained in step 4 of [this](https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup/) article. It is a random string of your choosing. 

The `ACCESSTOKEN` and `WEBTOKEN` variables can now be defined in your .env file. 

Obtaining a domain name and certificates must be done along with setting up the Facebook App. 

### Domain Name and Certificates 

Your Facebook Messenger server needs a domain name. Get a domain name from a domain registrar. 

Update an A record for your domain so the domain you just obtained points to the public IP address of your Facebook Messenger Bot server. This is done on the domain registrar's website ususally. 

It can take up to 48 hours for the DNS record to propogate, but is usually pretty quick. Once it has propogated, you need to obtain a certificate. You can get a certificate from Let's Encrypt for free. You may need to open port 80 on your firewall if it is not currently open. 

Now you can request the certificate from Let's Encrypt by running:

`sudo certbot certonly --standalone`

It is possible that this command will be different depending on the OS you are running, Certbot provides instructions [here](https://certbot.eff.org/instructions). 

Certificates should be created for your domain now. They will need to be renewed before 90 days when they expire. It is recommended to renew after 60 days.

When you are finished close port 80 if it is not needed.

You can now define the variables `PRIVKEYPATH`, `CERTPEMPATH`, `FULLCHAINPEMPATH`, and `CERTPATH` in your .env file. 

### Define port

Choose the port you would like to use for your application, you will need to give the port to Facebook in order for Facebook to connect to your server. You will also need to give the .env file the PORT variable. 

## Customization 

You can customize the messages your bot will send by editing the `messages.json` file. This file contains the responses, options and messages that the bot can send to users.  `index.js` gets the messages from this file to send. 

# Build 

Once you have setup everything you will need to build your docker image. The Dockerfile uses two args. 

## ARGS

The Dockerfile uses the following: ARGS
```
PORTNUMBER
CERTPATH
```
These must be passed to the Dockerfile as build args. Your chosen port will be PORTNUMBER and the path to your cert files will be CERTPATH. 

To build: 
```
docker-compose build --build-arg PORTNUMBER={PORTNUMBER} --build-arg CERTPATH={CERTPATH}
```

# Docker-compose 

Once you have built the image, you can run with:
```
docker-compose up 
```
or, if you would like to background the process: 
```
docker-compose up -d
``` 


