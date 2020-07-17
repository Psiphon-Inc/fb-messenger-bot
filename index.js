'use strict';

// Imports dependencies and set up http server
const

  express = require('express'),
  bodyParser = require('body-parser'),
  fs = require('fs'),
  https = require('https'),
  app = express().use(bodyParser.json()); // creates express http server


const key = fs.readFileSync('/etc/letsencrypt/live/test.cookierecipes.ml/privkey.pem');
const cert = fs.readFileSync('/etc/letsencrypt/live/test.cookierecipes.ml/cert.pem');
const creds = {
	key: key,
	cert: cert
};

require('dotenv').config();
// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {

  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0

      let webhook_event = entry.messaging[0];

      let sender_psid = webhook_event.sender.id;

      if (webhook_event.message) {

          handleMessage(sender_psid, webhook_event.message);

      } else if (webhook_event.postback) {

          handlePostback(sender_psid, webhook_event.postback);
      }

    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = process.env.WEBTOKEN;

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});


https.createServer({
	key: fs.readFileSync('/etc/letsencrypt/live/test.cookierecipes.ml/privkey.pem'), 
	cert: fs.readFileSync('/etc/letsencrypt/live/test.cookierecipes.ml/fullchain.pem') 
}, app).listen(3001, function() {
	console.log('The Server is open and we are listening');
});

// Handles messages events
function handleMessage(sender_psid, received_message) {

    let response;

    if (received_message.text) {
        response = {
            attachment: {
	      type: "template",
              payload: {
                template_type: "button",
                text: "Hello, welcome to the Psiphon Help Bot. What do you need help with? Please use the options below to navigate through the features.",
		buttons: [
                  {
	            type: "postback",
                    title: "Download Psiphon",
		    payload: "download-psiphon-1",
	          },
	          {
	            type: "postback",
		    title: "Cannot connect",
		    payload: "connection-problems-1",
	      },
		  {
		    type: "postback",
	            title: "What is Psiphon?",
	            payload: "what-is-psiphon",
		  }	  
	      ],}	    
	}};

    } else if (received_message.attachments) {

        let attachment_url = received_message.attachments[0].payload.url;

        response = {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
		title: "Hello, welcome to the Psiphon Help Bot. What do you need help with? Please use the options below to navigate through the features.",
                image_url: attachment_url,
                buttons: [
                  {
                     type: "postback",
                     title: "Cannot connect",
                     payload: "connection-problems-1",
                  },
                  {
                     type: "postback",
                     title: "What is Psiphon?",
                     payload: "what-is-psiphon",
                  },
			{
		      type: "postback",
		      title: "Send Feedback", 
		      payload: "feedback",
			}
                 ],
              }]
            }
         }
       }

    }
    callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  console.log('ok')
   let response;
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'download-psiphon-1') {
    response = { "text": "To download Psiphon, please visit this link https://s3.amazonaws.com/psiphon/web/vaf4-b0fm-8qs5/en/download.html " } 
    }
    else if (payload === 'feedback') {
    response = { "text": "To send us feedback, please do so from within the Psiphon application, using the Send Feedback function." }
  } else if (payload === 'what-is-psiphon') {
    response = { "text": "Psiphon is a free, open source, circumvention tool from Psiphon Inc. that utilizes VPN, SSH and HTTP Proxy technology to provide you with uncensored access to Internet content. Your Psiphon client will automatically learn about new access points to maximize your chances of bypassing censorship.Psiphon is designed to provide you with open access to online content. Psiphon does not increase your online privacy, and should not be considered or used as an online security tool. Read more: https://s3.amazonaws.com/psiphon/web/vaf4-b0fm-8qs5/en/index.html ." } } 
    else if (payload ==='connection-problems-1') {
    response = { "text": "Depending on network conditions, It may take several minutes to connect. Do not disconnect during this time. If you continue to experience difficulty, see ‘Troubleshooting’ in our FAQ for more. https://s3.amazonaws.com/psiphon/web/vaf4-b0fm-8qs5/en/faq.html" }}
// Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {

    let request_body = {
        recipient : {
            id : sender_psid,
         },
        message :  response,
    };

var accessToken = process.env.ACCESSTOKEN;
var accessPath = "/v7.0/me/messages?access_token=" + accessToken;


   const options = {
       messaging_type : "RESPONSE",
       hostname: 'graph.facebook.com',
       path: accessPath, 
       method : "POST",
       headers : {
           "Content-Type" : "application/json",
       },
};


//send https request to messngr platform

    const req = https.request(options, (res) =>  {
        console.log('Status code:', res.statusCode);
   }).on("error", (err) => {
        console.log("error:", err.message);
  });

    req.write(JSON.stringify(request_body));
    console.log("sent the message!");
    req.end();
}
