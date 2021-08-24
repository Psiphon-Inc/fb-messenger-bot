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

// The access tokens from your two Facebook pages.
// These can be found on the FB developer portal.
const accessToken1 = process.env.ACCESSTOKEN;
const accessToken2 = process.env.ACCESSTOKEN2;

// Facebook API URL to send POST requests to. 
// hostNamePath can be changed for new versions of the API. 
const hostNameFB = "graph.facebook.com";
const hostNamePath = "/v7.0/me/messages?access_token=";

//The pageID for your two Facebook pages. 
const pageid1 = process.env.PAGEID1;
const pageid2 = process.env.PAGEID2;

// Creates the endpoint for our webhook
// Reference (step 3) - https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup

app.post('/webhook', (req, res) => {

    let body = req.body;

    // Checks if this is an event from a page subscription
    if (body.object === "page") {


        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {

            let page = entry.messaging[0].recipient.id;
            let lang;

            //Check to see what page is communicating with the bot and then tailor the language to it.
            //Also use the correct PageID so replies will be sent to the correct page.
            if (page === pageid1) {
                lang = "esp";
                page = accessToken1;
                
            } else {
                lang = "eng";
                page = accessToken2;
            }

            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            let webhookEvent = entry.messaging[0];

            // Gets the Sender ID to be able to send messages to sender in messenger API	
            let senderPsid = webhookEvent.sender.id;

            // Handle Messenger API events	    
            if (webhookEvent.message) {

                handleMessage(senderPsid, webhookEvent.message, lang, page);

            } else if (webhookEvent.postback) {

                handlePostback(senderPsid, webhookEvent.postback, lang, page);
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

function callSendAPI(senderPsid, response, page) {


    let requestBody = {
        recipient: {
            id: senderPsid,
        },
        message: response,
    };

    // access path to make POST requests to - SendAPI URL

    const accessPath = hostNamePath + page;

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
    req.end();

}

// Handles messages events which is the Facebook name for any type of user input in messenger.
// Reference: https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages

function handleMessage(senderPsid, received_message, lang, page) {

    let response;
    let text = received_message.text;
    
    // Use the quick reply function to handle these message postbacks. 
    // Quick replies are a type of FB messenger button
    if (received_message.quick_reply) {

        handleQuickReply(senderPsid, received_message.quick_reply, lang, page);

        return;

    }  else if (received_message.text && ["HI", "HELLO", "HOLA", "¿ALó"].includes(text.toUpperCase())) {

        response = {
            text: msgTemplate.prompts[lang]["greeting"],
            quick_replies: [{
                    content_type: "text",
                    title: msgTemplate.qk_replies[lang]["what"],
                    payload: "what-is-psiphon",
                },
                {
                    content_type: "text",
                    title: msgTemplate.qk_replies[lang]["download"],
                    payload: "download-psiphon-1",
                },
                {
                    content_type: "text",
                    title: msgTemplate.qk_replies[lang]["connect"],
                    payload: "connection-problems-1",
                }
            ],
        }

    } else {
        // If the message sent from the user is none of the above then we prompt them to select "Options" to receive the "Options" menu. 
        response = {
            text: msgTemplate.qk_responses[lang]["error"],
            quick_replies: [{
                content_type: "text",
                title: msgTemplate.yesno[lang]["options"],
                payload: "yes-help",
            }, ]
        };
    }
    callSendAPI(senderPsid, response, page);
    return;
}

// Handles messaging_postbacks events
// Reference: "https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messaging_postbacks/"
function handlePostback(senderPsid, received_postback, lang, page) {


    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload === "download-psiphon-1") {

        let response = {
            text: msgTemplate.qk_responses[lang]["download-resp"]
        };
        callSendAPI(senderPsid, response, page);
        sendHelpMsg(senderPsid, lang, page);

    } else if (payload === "what-is-psiphon") {

       let response = {
            text: msgTemplate.qk_responses[lang]["what-resp-1"]
        };
        let response2 = {
            text: msgTemplate.qk_responses[lang]["what-resp-2"]
        };
        callSendAPI(senderPsid, response, page);
        setTimeout(() => callSendAPI(senderPsid, response2, page), 1000);
        setTimeout(() => sendHelpMsg(senderPsid, lang, page), 2000);


    } else if (payload === "connection-problems-1") {
         let response = {
            text: msgTemplate.qk_responses[lang]["connect-resp-1"]
        };
        let response2 = {
            text: msgTemplate.qk_responses[lang]["connect-resp-2"]
        };
        callSendAPI(senderPsid, response, page);
        setTimeout(() => callSendAPI(senderPsid, response2, lang), 1000);
        setTimeout(() => sendHelpMsg(senderPsid, lang, page), 2000);

    }
}

// Function to handle quick replies postbacks - the response sent after a user chooses one of our quick replies. 
// Payloads are attributes in postback events used to identify which quick reply was chosen. 
// Reference: https://developers.facebook.com/docs/messenger-platform/reference/buttons/quick-replies
function handleQuickReply(senderPsid, received_message, lang, page) {

    let payload = received_message.payload;

    if (payload === "yes-help") {

        sendMainMenu(senderPsid, lang, page);

    } else if (payload === "no-help") {

       let response = {
            text: msgTemplate.prompts[lang]["end-msg"]
        };

        callSendAPI(senderPsid, response, page);

    } else if (payload === "what-is-psiphon") {
  
       let response = {
            text: msgTemplate.qk_responses[lang]["what-resp-1"]
        };
        let response2 = {
            text: msgTemplate.qk_responses[lang]["what-resp-2"]
        };
	callSendAPI(senderPsid, response, page);
	setTimeout(() => callSendAPI(senderPsid, response2, page), 1000);
        console.log("sendHelpMsg after What is rsp handling");
        setTimeout(() => sendHelpMsg(senderPsid, lang, page), 2000);

    } else if (payload === "download-psiphon-1") {

        let response = {
            text: msgTemplate.qk_responses[lang]["download-resp"]
        };
        callSendAPI(senderPsid, response, page);
        sendHelpMsg(senderPsid, lang, page);

    } else if (payload === "connection-problems-1") {

        let response = {
            text: msgTemplate.qk_responses[lang]["connect-resp-1"]
        };
        let response2 = {
            text: msgTemplate.qk_responses[lang]["connect-resp-2"]
        };
	    callSendAPI(senderPsid, response, page);
	    setTimeout(() => callSendAPI(senderPsid, response2, page), 1000);
        setTimeout(() => sendHelpMsg(senderPsid, lang, page), 2000);

    } else {

        callSendAPI(senderPsid, {
            text: msgTemplate.qk_responses[lang]["error"]
        }, page);
        sendMainMenu(senderPsid, lang, page);
    }
;
}

// Main menu is a our core set of quick reply options.
function sendMainMenu(senderPsid, lang, page) {

    const response = {
        text: msgTemplate.prompts[lang]["greeting"],
        quick_replies: [{
                content_type: "text",
                title: msgTemplate.qk_replies[lang]["what"],
                payload: "what-is-psiphon",
            },
            {
                content_type: "text",
                title: msgTemplate.qk_replies[lang]["download"],
                payload: "download-psiphon-1",
            },
            {
                content_type: "text",
                title: msgTemplate.qk_replies[lang]["connect"],
                payload: "connection-problems-1",
            }
        ],
    }

    callSendAPI(senderPsid, response, page);

}

// This function adds a message to the all of the quick reply messages asking the user if they need any more help and giving them a yes/no option which will then give them the main menu again if they select yes.  This message asking if they need more help is sent 5 seconds after the first message/messages. 
function sendHelpMsg(senderPsid, lang, page) {


       const response3 = {
        text: msgTemplate.prompts[lang]["help"],
        quick_replies: [{
            content_type: "text",
            title: msgTemplate.yesno[lang]["yes-help"],
            payload: "yes-help",
        }, {
            content_type: "text",
            title: msgTemplate.yesno[lang]["no-help"],
            payload: "no-help",
        }, ]
    }
    
    setTimeout(() => callSendAPI(senderPsid, response3, page), 1000);
}



