// class EventinatorApp {
//     constructor() {
//         console.log("EventinatorApp constructor");
//     }
// }

// console.log("main.js loaded");
// let ea = new EventinatorApp();

/*
 * Create form to request access token from Google's OAuth 2.0 server.
 */
function oauthSignIn() {
    // Google's OAuth 2.0 endpoint for requesting an access token
    var oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

    // Create <form> element to submit parameters to OAuth 2.0 endpoint.
    var form = document.createElement("form");
    form.setAttribute("method", "GET"); // Send as a GET request.
    form.setAttribute("action", oauth2Endpoint);

    // Parameters to pass to OAuth 2.0 endpoint.
    var params = {
        client_id:
            "550349020422-m8h9na45b8abctrht36fsqadaueaqfrn.apps.googleusercontent.com",
        redirect_uri:
            "https://r-poulsen.github.io/eventinator/oauth2redirect.html",
        response_type: "token",
        scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
        include_granted_scopes: "true",
        state: "pass-through value",
    };

    // Add form parameters as hidden input values.
    for (var p in params) {
        var input = document.createElement("input");
        input.setAttribute("type", "hidden");
        input.setAttribute("name", p);
        input.setAttribute("value", params[p]);
        form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
}

if (!localStorage.getItem("access_token")) {
    oauthSignIn();
} else {
    gapi.load("client", initClient);
}

function initClient() {
    gapi.client
        .init({
            apiKey: "YOUR_API_KEY", // Your API Key
            clientId: "YOUR_CLIENT_ID", // Your OAuth Client ID
            discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
            ],
            scope: "https://www.googleapis.com/auth/calendar.events",
        })
        .then(function () {
            // Handle the client initialization
            // Call functions here to interact with the API

            gapi.client.calendar.events
                .insert({
                    calendarId: "primary", // Use 'primary' for the default calendar
                    resource: {
                        summary: "Event Title",
                        description: "Event Description",
                        start: {
                            dateTime: "2023-11-12T10:00:00",
                            timeZone: "UTC",
                        },
                        end: {
                            dateTime: "2023-11-12T12:00:00",
                            timeZone: "UTC",
                        },
                    },
                })
                .then(
                    function (response) {
                        console.log(
                            "Event created: " + response.result.htmlLink
                        );
                    },
                    function (error) {
                        console.error(
                            "Error creating event: " +
                                error.result.error.message
                        );
                    }
                );
        });
}
