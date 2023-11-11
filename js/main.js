class EventinatorApp {
    constructor() {
        console.log("EventinatorApp constructor");
    }
}

console.log("main.js loaded");
let ea = new EventinatorApp();

// Load the Google API client library
gapi.load("client:auth2", start);

function start() {
    gapi.client
        .init({
            apiKey: "AIzaSyDwyya24PHRbyx0fArS-eJJ6zCBV4OwSIA",
            clientId:
                "550349020422-m8h9na45b8abctrht36fsqadaueaqfrn.apps.googleusercontent.com",
            discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
            ],
            scope: "https://www.googleapis.com/auth/calendar",
            plugin_name: "calendar",
        })
        .then(function () {
            // Sign in the user upon button click
            gapi.auth2
                .getAuthInstance()
                .signIn()
                .then(function () {
                    // Define the calendar entry
                    var event = {
                        summary: "New Todo",
                        start: {
                            dateTime: "2023-12-01T09:00:00",
                            timeZone: "America/Los_Angeles",
                        },
                        end: {
                            dateTime: "2023-12-01T10:00:00",
                            timeZone: "America/Los_Angeles",
                        },
                    };

                    // Create the calendar entry
                    var request = gapi.client.calendar.events.insert({
                        calendarId: "primary",
                        resource: event,
                    });

                    request.execute(function (event) {
                        console.log("Event created: " + event.htmlLink);
                    });
                });
        });
}
