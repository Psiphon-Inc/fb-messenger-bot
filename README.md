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

You will get your ACCESSTOKEN from Facebook. Your Verify Token or WEBTOKEN is needed in this step as well, the Verify Token is explained in step 4 of [this](https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup/) article. It is a random string of your choosing. 

The ACCESSTOKEN and WEBTOKEN variables can now be defined in your .env file. 

Obtaining a domain name and certificates must be done along with setting up the Facebook App. 

### Domain Name and Certificates 

Your Facebook Messenger server needs a domain name. Get a domain name from a domain registrar. 

Update an A record for your domain so the domain you just obtained points to the public IP address of your Facebook Messenger Bot server. This is done on the domain registrar's website ususally. 

It can take up to 48 hours for the DNS record to propogate, but is usually pretty quick. Once it has propogated, you need to obtain a certificate. You can get a certificate from Let's Encrypt for free. You may need to open port 80 on your server if it is not currently open. How to do this will depend on how you have configured your firewall rules. If you are using iptables to configure your firewall, you can run:

`sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT`

Now you can request the certificate from Let's Encrypt by running:

`sudo certbot certonly --standalone`

It is also possible that this command will be different depending on the OS you are running, Certbot provides instructions [here](https://certbot.eff.org/instructions). 
Certificates should be created for your domain now. They will need to be renewed before 90 days when they expire. It is recommended to renew after 60 days.
Close port 80 by deleting the iptables rule. To view all iptables rules:
sudo iptables -L --line-numbers.
Once you know which rule you want to delete from the list, note the chain and line number of the rule. Then run the iptables -D command followed by the chain and rule number. For example, if it were the rule in line 3 in the INPUT chain:
sudo iptables -D INPUT 3


This is the index.js and messages.json file used for the Psiphon Facebook messenger bot. All customization was done in these files.
The messages.json file contains the responses, options and messages the bot can send to users. Index.js pulls from messages from this file. 

Here are the instructions from Facebook on creating a Facebook Messenger bot: https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup 

The messenger-webhook directory should be created, index.js should be cloned from this repository into messenger-webhook directory, then package.json and the express.js server can be downloaded following the instruction from the above link. 

Some variables are defined in a .env file. The paths for various cert files, and port numbers used. There are two tokens used in this file for authentication of communication between this server and Facebook, these files have been extracted as the variables 'ACCESS_TOKEN' and 'WEB_TOKEN', these variables need to be defined in a .env file on the server. They are removed from the file for security purposes.  

The Dockerfile uses two args: portNumber and certPath. These will need to be passed as --build-arg in the docker-compose build command. 
