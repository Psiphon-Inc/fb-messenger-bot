'use strict';

// Imports dependencies and set up https server
const

    msg_template = require("./messages.json"),
    express = require('express'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    https = require('https'),
    app = express().use(bodyParser.json()); // creates express http server

require('dotenv').config();

let privkeyPath = process.env.PRIVKEYPATH;
let certPemPath = process.env.CERTPEMPATH;
let fullChainPem = process.env.FULLCHAINPEMPATH;
let serverPort = process.env.PORT;
// Your verify token. Should be a random string.
let VERIFY_TOKEN = process.env.WEBTOKEN;
var accessToken = process.env.ACCESSTOKEN;



const key = fs.readFileSync(privkeyPath);
const cert = fs.readFileSync(certPemPath);
const creds = {
    key: key,
    cert: cert
};


// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {

    let body = req.body;

    // Checks if this is an event from a page subscription
    if (body.object === 'page') {

        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {

            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            // Gets the Sender ID to be able to send messages to sender in messenger API	

            let webhook_event = entry.messaging[0];

            let sender_psid = webhook_event.sender.id;


            // Handle Messenger API events	    
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

// Create the server to listen to webhook events on
https.createServer({
    key: fs.readFileSync(privkeyPath),
    cert: fs.readFileSync(fullChainPem)
}, app).listen(serverPort, function() {
    console.log('The Server is open and we are listening');
});


// Sends response messages via the Send API by FaceBook
function callSendAPI(sender_psid, response) {

    let request_body = {
        recipient: {
            id: sender_psid,
        },
        message: response,
    };

    // access path to make POST requests to - SendAPI URL
    var accessPath = "/v7.0/me/messages?access_token=" + accessToken;

    // configure webhook options
    const options = {
        messaging_type: "RESPONSE",
        hostname: 'graph.facebook.com',
        path: accessPath,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    };


    //send https request to messenger platform

    const req = https.request(options, (res) => {
        console.log('Status code:', res.statusCode);
    }).on("error", (err) => {
        console.log("error:", err.message);
    });

    req.write(JSON.stringify(request_body));
    console.log("sent the message!");
    req.end();
    return;
}


// Handles messages events
function handleMessage(sender_psid, received_message) {

    let response;
    let text = received_message.text;

    if (received_message.quick_reply) {

        handleQuickReply(sender_psid, received_message.quick_reply);

        return;

    } else if (text == "Hi" || text == "Hello" || text == "hi" || text == "hello") {
        console.log("recieved hi/hello");
        response = {
            text: msg_template.prompts.greeting,
            quick_replies: [{
                    content_type: "text",
                    title: msg_template.qk_replies.what,
                    payload: "what-is-psiphon",
                },
                {
                    content_type: "text",
                    title: msg_template.qk_replies.download,
                    payload: "download-psiphon-1",
                },
                {
                    content_type: "text",
                    title: msg_template.qk_replies.connect,
                    payload: "connection-problems-1",
                }
            ],
        }
    } else if (received_message.attachments) {

        let attachment_url = received_message.attachments[0].payload.url;

        response = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: msg_template.prompts.greeting,
                        image_url: attachment_url,
                        buttons: [{
                                type: "postback",
                                title: msg_template.qk_replies.what,
                                payload: "what-is-psiphon",
                            },
                            {
                                type: "postback",
                                title: msg_template.qk_replies.download,
                                payload: "download-psiphon-1",
                            },
                            {
                                type: "postback",
                                title: msg_template.qk_replies.connect,
                                payload: "connection-problems-1",
                            }
                        ],
                    }]
                }
            }
        }

    } else {

        callSendAPI(sender_psid, {
            text: msg_template.qk_responses.error,
            quick_replies: [{
                content_type: "text",
                title: "Options",
                payload: "yes-help",
            }, ]
        });

        return;
    }

    callSendAPI(sender_psid, response);
    return;
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

    let response;
    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload == 'download-psiphon-1') {

        response = {
            text: msg_template.qk_responses["download-resp"]
        };
        callSendAPI(sender_psid, response);
        send2msgs(sender_psid, response);

    } else if (payload == 'what-is-psiphon') {

        response = {
            text: msg_template.qk_responses["what-resp-1"]
        };
        let response3 = {
            text: msg_template.qk_responses["what-resp-2"]
        };
        send2msgs(sender_psid, new Array(response, response3));

    } else if (payload == 'connection-problems-1') {
        response = {
            text: msg_template.qk_responses["connect-resp-1"]
        };
        let response5 = {
            text: msg_template.qk_responses["connet-resp-2"]
        };
        send2msgs(sender_psid, new Array(response, response5));
    }

    return;
}


// Function to handle Quick Replys - quick reply is a feature in messenger API

function handleQuickReply(sender_psid, received_message) {

    let response;

    let payload = received_message.payload;

    if (payload === 'yes-help') {

        sendMainMenu(sender_psid);

    } else if (payload === 'no-help') {

        response = {
            text: msg_template.prompts["end-msg"]
        };

        callSendAPI(sender_psid, response);

    } else if (payload == 'what-is-psiphon') {

        response = {
            text: msg_template.qk_responses["what-resp-1"]
        };
        let response3 = {
            text: msg_template.qk_responses["what-resp-2"]
        };
        send2msgs(sender_psid, new Array(response, response3));


    } else if (payload == 'download-psiphon-1') {

        response = {
            text: msg_template.qk_responses["download-resp"]
        };
        callSendAPI(sender_psid, response);
        send2msgs(sender_psid, response);

    } else if (payload == 'connection-problems-1') {

        response = {
            text: msg_template.qk_responses["connect-resp-1"]
        };
        let response5 = {
            text: msg_template.qk_responses["connet-resp-2"]
        };
        send2msgs(sender_psid, new Array(response5, response));

    } else {

        callSendAPI(sender_psid, {
            text: msg_template.qk_responses.error
        });
        sendMainMenu(sender_psid);
    }

    return;

}



function sendMainMenu(sender_psid) {

    let response = {
        text: msg_template.prompts.greeting,
        quick_replies: [{
                content_type: "text",
                title: msg_template.qk_replies.what,
                payload: "what-is-psiphon",
            },
            {
                content_type: "text",
                title: msg_template.qk_replies.download,
                payload: "download-psiphon-1",
            },
            {
                content_type: "text",
                title: msg_template.qk_replies.connect,
                payload: "connection-problems-1",
            }
        ],
    }

    callSendAPI(sender_psid, response);

}

function send2msgs(sender_psid, response) {

    let response2;

    response2 = {
        text: msg_template.prompts.help,
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

    if (response.length != 1 || response.length != 0) {
        var i;

        for (i = 0; i < response.length; i++) {

            callSendAPI(sender_psid, response[i]);

        }

    }

    setTimeout(() => callSendAPI(sender_psid, response2), 7000);
}
