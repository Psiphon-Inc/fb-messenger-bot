/*
 * Copyright (c) 2020, Psiphon Inc.
 * Released under the MIT license.
 */

'use strict';

// Imports dependencies and set up https server
const
    msgTemplate = require("./messages.json"),
    express = require("express"),
    bodyParser = require("body-parser"),
    fs = require("fs"),
    https = require("https"),
    app = express().use(bodyParser.json()); // creates express http server

require('dotenv').config();

const privkeyPath = process.env.PRIVKEYPATH;
const fullChainPem = process.env.FULLCHAINPEMPATH;
const serverPort = process.env.PORT;

// Your verify token. Should be a random string.
const verifyToken = process.env.WEBTOKEN;
// const accessToken = process.env.ACCESSTOKEN;
const accessToken = process.env.ACCESSTOKEN;
// Facebook API URL to send POST requests to. 
// hostNamePath can be changed for new versions of the API. 
const hostNameFB = "graph.facebook.com";
const hostNamePath = "/v7.0/me/messages?access_token=";

// Creates the endpoint for our webhook
// Reference (step 3) - https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup
app.post('/webhook', (req, res) => {

    let body = req.body;

    // Checks if this is an event from a page subscription
    if (body.object === "page") {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {

            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            let webhookEvent = entry.messaging[0];
           
            // Gets the Sender ID to be able to send messages to sender in messenger API	
            let senderPsid = webhookEvent.sender.id;

            // Handle Messenger API events	    
            if (webhookEvent.message) {

                handleMessage(senderPsid, webhookEvent.message);

            } else if (webhookEvent.postback) {

                handlePostback(senderPsid, webhookEvent.postback);
            }

        });

        // Returns a '200 OK' response to all requests
        res.status(200).send("EVENT_RECEIVED");
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

// Adds support for GET requests to our webhook
// Reference (step 4) - https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup
app.get('/webhook', (req, res) => {

    // Parse the query params
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        console.log("mode & token are confirmed");

        // Checks the mode and token sent is correct
        if (mode === "subscribe" && token === verifyToken) {

            // Responds with the challenge token from the request
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);

        } else {

            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

// Create the server to listen to webhook events on
https.createServer({
    key: fs.readFileSync(privkeyPath),
    cert: fs.readFileSync(fullChainPem)
}, app).listen(serverPort, function() {
    console.log('The Server is open and we are listening');
});

// Sends messages of any type to user via the Send API by FaceBook
// Reference: https://developers.facebook.com/docs/messenger-platform/reference/send-api
function callSendAPI(senderPsid, response) {

    let requestBody = {
        recipient: {
            id: senderPsid,
        },
        message: response,
    };

    // access path to make POST requests to - SendAPI URL
    const accessPath = hostNamePath + accessToken;

    // configure webhook options
    const options = {
        messaging_type: "RESPONSE",
        hostname: hostNameFB,
        path: accessPath,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    };

    // Send https request to messenger platform

    let req = https.request(options, (res) => {
        console.log("Status code:", res.statusCode);
        console.log("Status code message:", res.statusMessage);
    }).on("error", (err) => {
        console.log("error:", err.message);
    });

    req.write(JSON.stringify(requestBody));
    console.log("sent the message!");
    req.end();
}

// Handles messages events which is the Facebook name for any type of user input in messenger.
// Reference: https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages
function handleMessage(senderPsid, received_message) {

    let response;
    let text = received_message.text;
    
    // Use the quick reply function to handle these message postbacks. 
    // Quick replies are a type of FB messenger button
    if (received_message.quick_reply) {

        handleQuickReply(senderPsid, received_message.quick_reply);

        return;

    }  else if (received_message.text && ["HI", "HELLO"].includes(text.toUpperCase())) {
        console.log("recieved hi/hello");
        response = {
            text: msgTemplate.prompts.greeting,
            quick_replies: [{
                    content_type: "text",
                    title: msgTemplate.qk_replies.what,
                    payload: "what-is-psiphon",
                },
                {
                    content_type: "text",
                    title: msgTemplate.qk_replies.download,
                    payload: "download-psiphon-1",
                },
                {
                    content_type: "text",
                    title: msgTemplate.qk_replies.connect,
                    payload: "connection-problems-1",
                }
            ],
        }
      console.info(response.quick_replies);
    } else if (received_message.attachments) {

        const attachmentUrl = received_message.attachments[0].payload.url;

        response = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: msgTemplate.prompts.greeting,
                        image_url: attachmentUrl,
                        buttons: [{
                                type: "postback",
                                title: msgTemplate.qk_replies.what,
                                payload: "what-is-psiphon",
                            },
                            {
                                type: "postback",
                                title: msgTemplate.qk_replies.download,
                                payload: "download-psiphon-1",
                            },
                            {
                                type: "postback",
                                title: msgTemplate.qk_replies.connect,
                                payload: "connection-problems-1",
                            }
                        ],
                    }]
                }
            }
        }

    } else {
        // If the message sent from the user is none of the above then we prompt them to select "Options" to receive the "Options" menu. 
        response = {
            text: msgTemplate.qk_responses.error,
            quick_replies: [{
                content_type: "text",
                title: "Options",
                payload: "yes-help",
            }, ]
        };    
    }
    callSendAPI(senderPsid, response);
    return;
}

// Handles messaging_postbacks events 
// Reference: "https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messaging_postbacks/"
function handlePostback(senderPsid, received_postback) {

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload === "download-psiphon-1") {
        
        let response = {
            text: msgTemplate.qk_responses["download-resp"]
        };
        callSendAPI(senderPsid, response);
        sendHelpMsg(senderPsid, response);

    } else if (payload === "what-is-psiphon") {
      
       let response = {
            text: msgTemplate.qk_responses["what-resp-1"]
        };
        let response2 = {
            text: msgTemplate.qk_responses["what-resp-2"]
        };
        callSendAPI(senderPsid, response);
        setTimeout(() => callSendAPI(senderPsid, response2), 1000);
        sendHelpMsg(senderPsid, [response, response2]);

//       sendHelpMsg(senderPsid, [
//            { text: msgTemplate.qk_responses["what-resp-1"] },
//            { text: msgTemplate.qk_responses["what-resp-2"] }
//        ]);
    } else if (payload === "connection-problems-1") {
         let response = {
            text: msgTemplate.qk_responses["connect-resp-1"]
        };
        let response2 = {
            text: msgTemplate.qk_responses["connect-resp-2"]
        };
        callSendAPI(senderPsid, response);
        setTimeout(() => callSendAPI(senderPsid, response2), 1000);
        sendHelpMsg(senderPsid, [response2, response]);
	   
	  //  sendHelpMsg(senderPsid, [
          //  { text: msgTemplate.qk_responses["connect-resp-1"] },
          //  { text: msgTemplate.qk_responses["connect-resp-2"] }
      //  ]);
    }
}

// Function to handle quick replies postbacks - the response sent after a user chooses one of our quick replies. 
// Payloads are attributes in postback events used to identify which quick reply was chosen. 
// Reference: https://developers.facebook.com/docs/messenger-platform/reference/buttons/quick-replies
function handleQuickReply(senderPsid, received_message) {

    let payload = received_message.payload;

    if (payload === "yes-help") {

        sendMainMenu(senderPsid);

    } else if (payload === "no-help") {

       let response = {
            text: msgTemplate.prompts["end-msg"]
        };

        callSendAPI(senderPsid, response);

    } else if (payload === "what-is-psiphon") {
  
       let response = {
            text: msgTemplate.qk_responses["what-resp-1"]
        };
        let response2 = {
            text: msgTemplate.qk_responses["what-resp-2"]
        };
	callSendAPI(senderPsid, response);
	setTimeout(() => callSendAPI(senderPsid, response2), 1000);
        sendHelpMsg(senderPsid, [response, response2]);

    } else if (payload === "download-psiphon-1") {

        let response = {
            text: msgTemplate.qk_responses["download-resp"]
        };
        callSendAPI(senderPsid, response);
        sendHelpMsg(senderPsid, response);

    } else if (payload === "connection-problems-1") {

        let response = {
            text: msgTemplate.qk_responses["connect-resp-1"]
        };
        let response2 = {
            text: msgTemplate.qk_responses["connect-resp-2"]
        };
	callSendAPI(senderPsid, response);
	setTimeout(() => callSendAPI(senderPsid, response2), 1000);
        sendHelpMsg(senderPsid, [response2, response]);
        
    } else {

        callSendAPI(senderPsid, {
            text: msgTemplate.qk_responses.error
        });
        sendMainMenu(senderPsid);
    }
}

// Main menu is a our core set of quick reply options.
function sendMainMenu(senderPsid) {

    const response = {
        text: msgTemplate.prompts.greeting,
        quick_replies: [{
                content_type: "text",
                title: msgTemplate.qk_replies.what,
                payload: "what-is-psiphon",
            },
            {
                content_type: "text",
                title: msgTemplate.qk_replies.download,
                payload: "download-psiphon-1",
            },
            {
                content_type: "text",
                title: msgTemplate.qk_replies.connect,
                payload: "connection-problems-1",
            }
        ],
    }

    callSendAPI(senderPsid, response);

}

// This function adds a message to the all of the quick reply messages asking the user if they need any more help and giving them a yes/no option which will then give them the main menu again if they select yes.  This message asking if they need more help is sent 5 seconds after the first message/messages. 
function sendHelpMsg(senderPsid, response) {

       let response3 = {
        text: msgTemplate.prompts.help,
        quick_replies: [{
            content_type: "text",
            title: "Yes",
            payload: "yes-help",
        }, {
            content_type: "text",
            title: "No",
            payload: "no-help",
        }, ]
    }
    
    setTimeout(() => callSendAPI(senderPsid, response3), 5000);
}
