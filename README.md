# fb-messenger-bot
Code for the Psiphon Facebook Messenger Bot

This is the index.js and messages.json file used for the Psiphon Facebook messenger bot. All customization was done in these files.
The messages.json file contains the responses, options and messages the bot can send to users. Index.js pulls from messages from this file. 

Here are the instructions from Facebook on creating a Facebook Messenger bot: https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup 

The messenger-webhook directory should be created, index.js should be cloned from this repository into messenger-webhook directory, then package.json and the express.js server can be downloaded following the instruction from the above link. 

Some variables are defined in a .env file. The paths for various cert files, and port numbers used. There are two tokens used in this file for authentication of communication between this server and Facebook, these files have been extracted as the variables 'ACCESS_TOKEN' and 'WEB_TOKEN', these variables need to be defined in a .env file on the server. They are removed from the file for security purposes.   
