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
// function oauthSignIn() {
// Google's OAuth 2.0 endpoint for requesting an access token
// var oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

// Create <form> element to submit parameters to OAuth 2.0 endpoint.
// var form = document.createElement("form");
// form.setAttribute("method", "GET"); // Send as a GET request.
// form.setAttribute("action", oauth2Endpoint);

// Parameters to pass to OAuth 2.0 endpoint.
// var params = {
//     client_id:
//         "550349020422-m8h9na45b8abctrht36fsqadaueaqfrn.apps.googleusercontent.com",
//     redirect_uri:
//         "https://r-poulsen.github.io/eventinator/oauth2redirect.html",
//     response_type: "token",
//     scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
//     include_granted_scopes: "true",
//     state: "pass-through value",
// };

// Add form parameters as hidden input values.
// for (var p in params) {
//     var input = document.createElement("input");
//     input.setAttribute("type", "hidden");
//     input.setAttribute("name", p);
//     input.setAttribute("value", params[p]);
//     form.appendChild(input);
// }

// Add form to page and submit it to open the OAuth 2.0 endpoint.
//     document.body.appendChild(form);
//     form.submit();
// }

// if (!localStorage.getItem("access_token")) {
//     oauthSignIn();
// } else {
//     gapi.load("client", initClient);
// }

// function initClient() {
//     gapi.client
//         .init({
//             apiKey: "YOUR_API_KEY", // Your API Key
//             clientId: "YOUR_CLIENT_ID", // Your OAuth Client ID
//             discoveryDocs: [
//                 "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
//             ],
//             scope: "https://www.googleapis.com/auth/calendar.events",
//         })
//         .then(function () {
// Handle the client initialization
// Call functions here to interact with the API

//             gapi.client.calendar.events
//                 .insert({
//                     calendarId: "primary", // Use 'primary' for the default calendar
//                     resource: {
//                         summary: "Event Title",
//                         description: "Event Description",
//                         start: {
//                             dateTime: "2023-11-12T10:00:00",
//                             timeZone: "UTC",
//                         },
//                         end: {
//                             dateTime: "2023-11-12T12:00:00",
//                             timeZone: "UTC",
//                         },
//                     },
//                 })
//                 .then(
//                     function (response) {
//                         console.log(
//                             "Event created: " + response.result.htmlLink
//                         );
//                     },
//                     function (error) {
//                         console.error(
//                             "Error creating event: " +
//                                 error.result.error.message
//                         );
//                     }
//                 );
//         });
// }

class ListInput {
    constructor(baseName) {
        this.baseName = baseName;
        this.containerElement = document.getElementById(this.baseName);

        const label = document.createElement("label");
        label.for = this.baseName + "_input";
        label.textContent = this.baseName;

        this.numInput = document.createElement("input");
        this.numInput.type = "number";
        this.numInput.id = this.baseName + "_input";
        this.numInput.min = "1";
        this.numInput.value = "1";

        this.containerElement.appendChild(label);
        this.containerElement.appendChild(this.numInput);

        this.listContainer = document.createElement("div");
        this.listContainer.id = this.baseName + "_list_container";

        this.containerElement.appendChild(this.listContainer);

        this.numInput.addEventListener(
            "input",
            this.adjustInputFields.bind(this)
        );

        this.adjustInputFields();
    }

    adjustInputFields() {
        const inputCount = this.numInput.value;
        const listContainer = document.getElementById(
            this.baseName + "_list_container"
        );

        // Remove superfluous input fields
        while (listContainer.children.length > inputCount) {
            listContainer.removeChild(listContainer.lastChild);
        }

        // Add new input fields
        for (let i = listContainer.children.length; i < inputCount; i++) {
            const input = document.createElement("input");
            input.type = "text";
            if (this.baseName.endsWith("s")) {
                input.placeholder = `${this.baseName.slice(0, -1)} ${i + 1}`;
            } else {
                input.placeholder = `${this.baseName} ${i + 1}`;
            }
            listContainer.appendChild(input);
        }
    }

    /**
     * Returns the value of the numInput element.
     * @returns {number} The value of the numInput element.
     */
    getCount() {
        return this.numInput.value;
    }

    /**
     * Returns the values of the input fields as a human readable string.
     * @returns {string} The values of the input fields as a string
     */
    getValues() {
        const values = [];
        const listContainer = document.getElementById(
            this.baseName + "_list_container"
        );

        for (const child of listContainer.children) {
            if (child.value === "") {
                values.push(child.placeholder);
            } else {
                values.push(child.value);
            }
        }

        let result = "";
        if (values.length === 1) {
            result = values[0];
        } else if (values.length === 2) {
            result = `${values[0]} and ${values[1]}`;
        } else if (values.length > 2) {
            result = `${values.slice(0, -1).join(", ")} and ${values.slice(
                -1
            )}`;
        }

        return result;
    }
}

let listInput = null;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize the glorious Participants input
    listInput = new ListInput("Participants");

    // Set the date and time of the ticket and event inputs to something somewhat sensible
    setDateTimeInput("ticket_dt", 1, 10);
    setDateTimeInput("event_dt", 30, 20);

    // Add enable_disable_inputs() as an event listener when any of these checkboxes are clicked

    ["purchase_reminder", "calendar_entry", "update_doc"].forEach(
        (checkbox_id) => {
            document
                .getElementById(checkbox_id)
                .addEventListener("click", enable_disable_inputs);
        }
    );

    enable_disable_inputs();
});

function enable_disable_inputs() {
    enableElementsInContainer(
        "ticket",
        document.getElementById("purchase_reminder").checked
    );

    enableElementsInContainer(
        "ticket_calendar",
        document.getElementById("purchase_reminder").checked
    );

    // enableElementsInContainer(
    //     "event_time",
    //     document.getElementById("calendar_entry").checked
    // );

    enableElementsInContainer(
        "event_time",
        document.getElementById("calendar_entry").checked ||
            document.getElementById("update_doc").checked
    );

    enableElementsInContainer(
        "add_container",
        document.getElementById("purchase_reminder").checked ||
            document.getElementById("calendar_entry").checked ||
            document.getElementById("update_doc").checked
    );

    enableElementsInContainer(
        "event",
        document.getElementById("purchase_reminder").checked ||
            document.getElementById("calendar_entry").checked ||
            document.getElementById("update_doc").checked
    );

    enableElementsInContainer(
        "event_calendar",
        document.getElementById("calendar_entry").checked
    );

    toggleDurationInputs();
}

function setDateTimeInput(input_id, daysOffset, hours) {
    // Get current date and time
    let date = new Date();

    // Add one day to get tomorrow's date
    date.setDate(date.getDate() + daysOffset);

    // Set the time to 10:00
    date.setHours(hours);
    date.setMinutes(0);
    date.setSeconds(0);

    // Get the timezone offset in minutes
    let timezoneOffset = date.getTimezoneOffset();

    // Subtract the timezone offset from the date
    date.setMinutes(date.getMinutes() - timezoneOffset);

    // Format the date and time in the format required by datetime-local inputs
    let dateTime = date.toISOString().substring(0, 16);

    // Get the input element with the id "ticket_dt"
    let input = document.getElementById(input_id);

    // Set the value of the input element to the formatted date and time
    input.value = dateTime;
}

function toggleDurationInputs() {
    const hoursInput = document.getElementById("duration_hours_elements");
    const daysInput = document.getElementById("duration_days_elements");
    const allDayCheckbox = document.getElementById("all_day");

    if (allDayCheckbox.checked) {
        hoursInput.style.display = "none";
        daysInput.style.display = "";
    } else {
        hoursInput.style.display = "";
        daysInput.style.display = "none";
    }
}

function enableElementsInContainer(id, enable = true) {
    // Get the div element with the specified id
    let container = document.getElementById(id);

    // Get all the elements inside the div
    let elements = container.querySelectorAll("*");

    // Loop over the input elements and enable/disable them based on the enable parameter
    for (const element of elements) {
        if (enable) {
            element.style.display = "";
        } else {
            element.style.display = "none";
        }
        element.disabled = !enable;
    }

    if (enable) {
        container.style.display = "";
    } else {
        container.style.display = "none";
    }
}

const CLIENT_ID =
    "550349020422-m8h9na45b8abctrht36fsqadaueaqfrn.apps.googleusercontent.com";
//const API_KEY = "<YOUR_API_KEY>";

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC =
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES =
    "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.owned";

let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
    gapi.load("client", initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
    await gapi.client.init({
        //apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: "", // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        // document.getElementById("authorize").style.visibility = "visible";
        document.getElementById("authorize").style.display = "";
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw resp;
        }
        // document.getElementById("authorize").style.visibility = "hidden";
        document.getElementById("authorize").style.display = "none";
        document.getElementById("main").style.visibility = "visible";
        await listCalendars();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: "" });
    }
}

/**
 * List calendars using the Google Calendar API.
 */
async function listCalendars() {
    const response = await gapi.client.calendar.calendarList.list();
    const ticketElement = document.getElementById("ticket_calendar_select");
    const eventElement = document.getElementById("event_calendar_select");

    response.result.items.forEach((calendar) => {
        if (calendar.accessRole !== "reader") {
            const optionElement = document.createElement("option");
            optionElement.value = calendar.id;
            optionElement.text = calendar.summary;

            eventElement.add(optionElement);
            ticketElement.add(optionElement.cloneNode(true));
        }
    });
}

/**
 * Add a calendar entry using the Google Calendar API.
 */
async function addCalendarEntry() {
    const event = {
        summary: "Google I/O 2015",
        location: "800 Howard St., San Francisco, CA 94103",
        description: "A chance to hear more about Google's developer products.",
        start: {
            dateTime: "2023-12-01T09:00:00-07:00",
            timeZone: "America/Los_Angeles",
        },
        end: {
            dateTime: "2023-12-01T17:00:00-07:00",
            timeZone: "America/Los_Angeles",
        },
    };

    const request = gapi.client.calendar.events.insert({
        calendarId: "primary",
        resource: event,
    });

    request.execute((event) => {
        document.getElementById("content").innerText =
            "Event created: " + event.htmlLink;
    });
}

/**
 * Print the summary and start datetime/date of the next ten events in
 * the authorized user's calendar. If no events are found an
 * appropriate message is printed.
 */
async function listUpcomingEvents() {
    let response;
    try {
        const request = {
            calendarId: "primary",
            timeMin: new Date().toISOString(),
            showDeleted: false,
            singleEvents: true,
            maxResults: 10,
            orderBy: "startTime",
        };
        response = await gapi.client.calendar.events.list(request);
    } catch (err) {
        document.getElementById("content").innerText = err.message;
        return;
    }

    const events = response.result.items;
    if (!events || events.length == 0) {
        document.getElementById("content").innerText = "No events found.";
        return;
    }
    // Flatten to string to display
    const output = events.reduce(
        (str, event) =>
            `${str}${event.summary} (${
                event.start.dateTime || event.start.date
            })\n`,
        "Events:\n"
    );
    document.getElementById("content").innerText = output;
}
