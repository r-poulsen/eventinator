let app = null;

const minutes_ms = 60 * 1000;
const hours_ms = 60 * minutes_ms;
const days_ms = 24 * hours_ms;

// Initialize the Google API client for Discovery document
// retrieval.
const discoveryUrl = "https://sheets.googleapis.com/$discovery/rest?version=v4";
const DISCOVERY_DOCS = [
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
];
// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES =
    "https://www.googleapis.com/auth/calendar.events.owned " +
    "https://www.googleapis.com/auth/calendar.readonly";

let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Copies the contents of a given element to the clipboard.
 *
 * @param {Element} element - The element whose contents will be copied.
 */
function copyContents(element) {
    let range = document.createRange();
    range.selectNode(element);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
}

class ListInput {
    constructor(baseName, placeholder) {
        this.baseName = baseName;
        this.placeholder = placeholder;
        this.containerElement = document.getElementById(this.baseName);

        const label = document.createElement("label");
        label.for = this.baseName + "_input";
        label.textContent = this.placeholderPlural;

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
            input.placeholder = `${this.placeholder} ${i + 1}`;
            input.id = `${this.baseName}_${i + 1}`;

            // Set the value to the localStorage item
            const localStorageItem = localStorage.getItem(
                `${input.id}_autocomplete`
            );
            if (localStorageItem) {
                input.value = localStorageItem;
            }

            listContainer.appendChild(input);
            autocomplete(input.id, "participants_autocomplete");

            // Add event listener to update localStorage item on input change
            input.addEventListener("input", () => {
                localStorage.setItem(`${input.id}_autocomplete`, input.value);
            });
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
            result = `${values[0]} og ${values[1]}`;
        } else if (values.length > 2) {
            result = `${values.slice(0, -1).join(", ")} og ${values.slice(-1)}`;
        }
        return result;
    }
}

class EventList {
    // The list of events. Displayed in a series of tables with a year header
    constructor() {
        this.parentElement = document.getElementById("event_table_container");
        this.events = [];
    }

    addEvent(event) {
        this.events.push(event);
    }

    render() {
        let year = null;
        let previousYear = null;

        // Render the list of events into year headers and tables, sorted by the event date

        this.events.sort((a, b) => {
            const dateA = new Date(a.start.dateTime || a.start.date);
            const dateB = new Date(b.start.dateTime || b.start.date);
            return dateA - dateB;
        });

        // Iterate over the sorted list of events
        for (const event of this.events) {
            // Render the event details
            // const eventDate = event.start.dateTime || event.start.date;
            if (event.start.date) {
                year = new Date(event.start.date).getFullYear();
            } else {
                year = new Date(event.start.dateTime).getFullYear();
            }

            if (year !== previousYear) {
                const d = document.createElement("div");
                d.classList.add("year_header");
                d.innerText = year;
                this.parentElement.appendChild(d);
                this.table = document.createElement("table");
                this.parentElement.appendChild(this.table);
                previousYear = year;
            }

            const row = this.table.insertRow(-1);
            row.addEventListener("click", () => {
                window.open(event.htmlLink);
            });

            const participants_cell = row.insertCell(0);
            const datetime_cell = row.insertCell(1);
            const eventname_cell = row.insertCell(2);
            const location_cell = row.insertCell(3);

            let matches = event.description.match(
                /(?:Participants|Deltagere): (.+)/u
            );
            if (matches) {
                matches[1]
                    .split(/,|og|and/)
                    .map(function (name) {
                        return name.trim();
                    })
                    .filter(function (name) {
                        return name !== "";
                    })
                    .forEach(function (name) {
                        const d = document.createElement("div");
                        d.classList.add("name");
                        d.innerText = name;
                        participants_cell.appendChild(d);
                    });
            }

            if (event.start.date) {
                let startDate = new Date(event.start.date);
                let endDate = new Date(event.end.date);
                endDate.setDate(endDate.getDate() - 1);

                if (endDate < startDate) {
                    endDate = new Date(event.end.date);
                }

                if (startDate.getTime() === endDate.getTime()) {
                    datetime_cell.innerHTML = `${startDate.toLocaleString(
                        "da-DK",
                        {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                        }
                    )}`;
                } else {
                    datetime_cell.innerHTML = `${startDate.toLocaleString(
                        "da-DK",
                        {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                        }
                    )} - ${endDate.toLocaleString("da-DK", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                    })}`;
                }
            } else {
                datetime_cell.innerHTML = `${new Date(
                    event.start.dateTime
                ).toLocaleString("da-DK", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "numeric",
                })}`;
            }

            matches = event.summary.match(/^[🎶🎥😀🏈🎭🎉🎫] [A-Å]\w+: (.+)/u);
            if (matches) {
                eventname_cell.innerHTML = matches[1];
            }

            if (event.location) {
                location_cell.innerHTML = event.location;
            }
        }
    }

    clearList() {
        // Clears the list of events
        this.events = [];
    }
}

/**
 * A utility class for displaying toast messages.
 */
class Toaster {
    static success(title, text) {
        VanillaToasts.create({
            title: title,
            text: text,
            icon: "icons/ok.png",
            type: "success",
            timeout: 30000,
            positionClass: "bottomRight",
        });
    }

    static error(error, error_code = null) {
        let error_message = null;

        if (
            typeof error === "object" &&
            "result" in error &&
            error["result"]["error"]["errors"][0]["message"]
        ) {
            error_message = error["result"]["error"]["errors"][0]["message"];
        } else {
            error_message = error;
        }

        if (error_code) {
            console.log(`${error_code}: ${error_message}`);
        }
        VanillaToasts.create({
            title: "An error occurred!",
            icon: "icons/error.png",
            text: error_message,
            type: "error",
            positionClass: "bottomRight",
        });
    }

    static event_link(event) {
        const a = document.createElement("a");
        a.href = event.htmlLink;
        a.target = "_blank";
        a.innerHTML = event.summary;
        return a.outerHTML;
    }

    static reminder_added(event) {
        this.success("Påmindelse tilføjet", Toaster.event_link(event));
    }

    static event_added(event) {
        this.success("Begivenhed tilføjet", Toaster.event_link(event));
    }
}

class EventinatorApp {
    constructor() {
        this.eventList = new EventList();
        EventinatorApp.loadScript(
            "https://apis.google.com/js/api.js",
            gapiLoaded
        );
        EventinatorApp.loadScript(
            "https://accounts.google.com/gsi/client",
            gisLoaded
        );

        // Initialize the list input for participants
        this.listInput = new ListInput("Participants", "Deltager", "Deltagere");

        // Set the date and time of the ticket and event inputs to something somewhat sensible

        // TODO: These should be classes
        setDateTimeInput("ticket_dt", 1, 10);
        setDateTimeInput("event_dt", 30, 20);

        // Add enable_disable_inputs() as an event listener when any of these checkboxes are clicked
        // TODO: These should be classes
        ["purchase_reminder", "calendar_entry"].forEach((checkbox_id) => {
            document
                .getElementById(checkbox_id)
                .addEventListener("click", enable_disable_inputs);
        });

        // Add enable_disable_add_button() as an event listener when any of these inputs are changed
        [
            "purchase_reminder",
            "calendar_entry",
            "event_name",
            "ticket_dt",
            "event_dt",
        ].forEach((input_id) => {
            document
                .getElementById(input_id)
                .addEventListener("input", enable_disable_add_button);
        });

        enable_disable_inputs();

        document
            .getElementById("add_btn")
            .addEventListener("click", async () => {
                //
                try {
                    const names = Array.from(
                        document.querySelectorAll(
                            "#Participants_list_container input"
                        )
                    ).map((input) => input.value || input.placeholder);

                    let nameString;
                    switch (names.length) {
                        case 0:
                            nameString = "";
                            break;
                        case 1:
                            nameString = names[0];
                            break;
                        case 2:
                            nameString = names.join(" og ");
                            break;
                        default:
                            nameString = `${names.slice(0, -1).join(", ")} og ${
                                names[names.length - 1]
                            }`;
                    }

                    let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

                    if (document.getElementById("purchase_reminder").checked) {
                        const noun = names.length > 1 ? "billetter" : "billet";

                        const reminder = {};
                        reminder["summary"] = `Køb ${noun} til ${
                            document.getElementById("event_name").value
                        }`;
                        reminder["description"] = `${
                            names.length
                        } ${noun}; Til ${nameString}${
                            document.getElementById("ticket_url").value
                                ? "\n\n" +
                                  document.getElementById("ticket_url").value
                                : ""
                        }${
                            document.getElementById("ticket_notes").value
                                ? "\n\n" +
                                  document.getElementById("ticket_notes").value
                                : ""
                        }`;
                        reminder["start"] = {
                            dateTime: new Date(
                                document.getElementById("ticket_dt").value
                            ).toISOString(),
                            timeZone: tz,
                        };
                        reminder["end"] = {
                            dateTime: new Date(
                                Date.parse(
                                    document.getElementById("ticket_dt").value
                                ) +
                                    15 * minutes_ms
                            ).toISOString(),
                            timeZone: tz,
                        };
                        reminder["reminders"] = {
                            useDefault: false,
                            overrides: [
                                { method: "email", minutes: 30 },
                                { method: "popup", minutes: 10 },
                            ],
                        };

                        // Save the id of the calendar in a localstorage item
                        // so we can use it later
                        localStorage.setItem(
                            "latest_used_reminder_calendar",
                            document.getElementById("ticket_calendar_select")
                                .value
                        );

                        await authenticate();

                        addCalendarEvent(
                            reminder,
                            document.getElementById("ticket_calendar_select")
                                .value
                        )
                            .then((response) => {
                                Toaster.reminder_added(response);
                            })
                            .catch((error) => {
                                Toaster.error(error, "b5a5");
                                throw error;
                            });
                    }

                    if (document.getElementById("calendar_entry").checked) {
                        let selectElement =
                            document.getElementById("event_type_sel");
                        let selectedOption =
                            selectElement.options[selectElement.selectedIndex];

                        let start = {
                            timeZone: tz,
                        };
                        let end = {
                            timeZone: tz,
                        };
                        if (document.getElementById("all_day").checked) {
                            start["date"] = new Date(
                                document.getElementById("event_dt").value
                            )
                                .toISOString()
                                .slice(0, 10);
                            end["date"] = new Date(
                                Date.parse(
                                    document.getElementById("event_dt").value
                                ) +
                                    document.getElementById(
                                        "event_duration_days"
                                    ).value *
                                        days_ms
                            )
                                .toISOString()
                                .slice(0, 10);
                        } else {
                            start["dateTime"] = new Date(
                                document.getElementById("event_dt").value
                            ).toISOString();
                            end["dateTime"] = new Date(
                                Date.parse(
                                    document.getElementById("event_dt").value
                                ) +
                                    document.getElementById(
                                        "event_duration_hours"
                                    ).value *
                                        hours_ms
                            ).toISOString();
                        }
                        const event = {
                            summary: `${selectedOption.textContent}: ${
                                document.getElementById("event_name").value
                            }`,
                            location: document.getElementById("location").value,
                            description: `Deltagere: ${nameString}`,
                            start: start,
                            end: end,
                        };

                        localStorage.setItem(
                            "latest_used_event_calendar",
                            document.getElementById("event_calendar_select")
                                .value
                        );

                        await authenticate();

                        addCalendarEvent(
                            event,
                            document.getElementById("event_calendar_select")
                                .value
                        )
                            .then((response) => {
                                Toaster.event_added(response);

                                // Clear all elements inside the event_table_container
                                const container = document.getElementById(
                                    "event_table_container"
                                );
                                while (container.firstChild) {
                                    container.removeChild(container.firstChild);
                                }

                                // Reload the table for all calendars
                                loadAndRenderCalendars();
                            })
                            .catch((error) => {
                                Toaster.error(error, "9bf8");
                                throw error;
                            });
                    }
                } catch (error) {
                    Toaster.error(error, "c4d4");
                    throw error;
                    localStorage.removeItem("access_token");
                    gapi.client.setToken(null);
                    document.getElementById("add_btn").click();
                }
                autocompleteAdd(
                    "event_name",
                    document.getElementById("event_name").value
                );
                autocompleteAdd(
                    "location",
                    document.getElementById("location").value
                );

                // add each participant to the autocomplete list
                Array.from(
                    document.querySelectorAll(
                        "#Participants_list_container input"
                    )
                ).forEach((input) => {
                    autocompleteAdd("participants", input.value);
                    localStorage.setItem(
                        `${input.id}_autocomplete`,
                        input.value
                    );
                });
            });

        autocomplete("event_name");
        autocomplete("location");

        // set the value of the checkbox "automatic_authorize" from the localstorage item of the same name

        document.getElementById("automatic_authorize").checked =
            localStorage.getItem("automatic_authorize");
    }

    static loadScript(src, onload) {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = onload;
        document.head.appendChild(script);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Initialize the glorious Eventinator app when the DOM is loaded
    app = new EventinatorApp();
});

function enable_disable_add_button() {
    const task = document.getElementById("purchase_reminder").checked;
    const event = document.getElementById("calendar_entry").checked;

    const event_name_valid =
        document.getElementById("event_name").value.trim() !== "";

    const event_date_valid = Date.parse(
        document.getElementById("event_dt").value
    );

    const task_date_valid = Date.parse(
        document.getElementById("ticket_dt").value
    );

    document.getElementById("add_btn").style.display = "";

    if (task && event) {
        document.getElementById("add_btn").innerText =
            "Opret påmindelse og begivenhed";

        document.getElementById("add_btn").disabled = !(
            task_date_valid &&
            event_name_valid &&
            event_date_valid
        );
    } else if (task && !event) {
        document.getElementById("add_btn").innerText = "Opret påmindelse";
        document.getElementById("add_btn").disabled = !(
            task_date_valid &&
            event_name_valid &&
            event_date_valid
        );
    } else if (!task && event) {
        document.getElementById("add_btn").innerText = "Opret begivenhed";

        document.getElementById("add_btn").disabled = !(
            event_name_valid && event_date_valid
        );
    } else {
        document.getElementById("add_btn").style.display = "none";
    }
}

function enable_disable_inputs() {
    enableElementsInContainer(
        "ticket",
        document.getElementById("purchase_reminder").checked
    );
    enableElementsInContainer(
        "ticket_calendar",
        document.getElementById("purchase_reminder").checked
    );
    enableElementsInContainer(
        "event_time",
        document.getElementById("calendar_entry").checked
    );
    enableElementsInContainer(
        "event",
        document.getElementById("purchase_reminder").checked ||
            document.getElementById("calendar_entry").checked
    );
    enableElementsInContainer(
        "event_calendar",
        document.getElementById("calendar_entry").checked
    );
    toggleDurationInputs();
    enable_disable_add_button();
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

/**
 * Enables or disables all elements inside a container based on the specified ID.
 * @param {string} id - The ID of the container element.
 * @param {boolean} [enable=true] - Whether to enable or disable the elements. Default is true.
 */
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

/**
 * Callback function called when the Google API client library is loaded.
 * Initializes the client and sets the gapiInited flag to true.
 * @returns {void}
 */
function gapiLoaded() {
    gapi.load("client", async () => {
        await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        googeApisLoaded();
    });
}

/**
 * Initializes the GIS (Geographic Information System) and sets the token client.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: "", // defined later
        prompt: "",
    });
    gisInited = true;
    googeApisLoaded();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function googeApisLoaded() {
    if (gapiInited && gisInited) {
        document.getElementById("authorize").style.display = "";
        if (localStorage.getItem("automatic_authorize")) {
            authenticate();
        }
    }
}

/**
 * Authenticates the user and retrieves an access token.
 * If an access token already exists and is valid, it skips the authentication process.
 * If the access token is expired or invalid, it deletes the token and retries the authentication.
 * @returns {Promise<void>} A promise that resolves when the authentication process is complete.
 */
async function authenticate() {
    tokenClient.callback = async (response) => {
        if (response.error !== undefined) {
            Toaster.error(response.error, "a6b9");
            throw response.error;
        }
        localStorage.setItem(
            "access_token",
            gapi.client.getToken().access_token
        );
        document.getElementById("authorize").style.display = "none";
        document.getElementById("main").style.visibility = "visible";
        await loadAndRenderCalendars();
    };

    if (localStorage.getItem("access_token") !== null) {
        gapi.client.setToken({
            access_token: localStorage.getItem("access_token"),
        });

        if (gapi.client.getToken() && !gapi.client.getToken().expired) {
            // Access token seems valid
            document.getElementById("authorize").style.display = "none";
            document.getElementById("main").style.visibility = "visible";
            try {
                await loadAndRenderCalendars();
            } catch (error) {
                // Any errors encountered here are most likely due to an invalid access token,
                // so we delete it and try again
                // Toaster.error(error, "4c4d");
                localStorage.removeItem("access_token");
                gapi.client.setToken(null);
                // await authenticate();
            }
        } else {
            // Access token is expired
            Toaster.error(error, "908f");
            localStorage.removeItem("access_token");
            gapi.client.setToken(null);
            await authenticate();
        }
    }

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: "consent" });
    }
}

/**
 * Retrieves a list of calendars and populates the ticket and event select elements.
 * @returns {Promise<void>} A promise that resolves when the calendars are listed.
 */
async function loadAndRenderCalendars() {
    app.eventList.clearList();

    const ticketElement = document.getElementById("ticket_calendar_select");
    const eventElement = document.getElementById("event_calendar_select");

    // Clear the select elements
    while (ticketElement.options.length > 0) {
        ticketElement.remove(0);
    }
    while (eventElement.options.length > 0) {
        eventElement.remove(0);
    }

    await gapi.client.calendar.calendarList
        .list()
        .then(async (response) => {
            const promises = response.result.items.map(async (calendar) => {
                if (calendar.accessRole !== "reader") {
                    const optionElement = document.createElement("option");
                    optionElement.value = calendar.id;
                    optionElement.text = calendar.summary;
                    eventElement.add(optionElement);
                    ticketElement.add(optionElement.cloneNode(true));
                }

                return fetchCalendarEvents(calendar.id);
            });
            // Wait for all promises to resolve
            return Promise.all(promises);
        })
        .then(() => {
            app.eventList.render();
        });

    // Preselect the calendar based on the ID stored in localStorage
    const latestEventCalendarId = localStorage.getItem(
        "latest_used_event_calendar"
    );
    if (latestEventCalendarId) {
        eventElement.value = latestEventCalendarId;
    }
    const latestReminderCalendarId = localStorage.getItem(
        "latest_used_reminder_calendar"
    );
    if (latestEventCalendarId) {
        ticketElement.value = latestReminderCalendarId;
    }
}

function filterNames() {
    // Show or hide each <div> containing ${name} as innertext based on the checked state of the checkbox with the name participant_show_${name}
    const checkboxes = document.querySelectorAll(
        "#filter_names_container input"
    );

    for (const checkbox of checkboxes) {
        console.log(`checkbox.id: ${checkbox.id}`);
        const name = checkbox.id.substring(17);
        console.log(`name: ${name}`);
        const names = document.querySelectorAll(`.name`);
        for (const nameElement of names) {
            if (nameElement.innerText === name) {
                if (checkbox.checked) {
                    nameElement.style.display = "";
                } else {
                    nameElement.style.display = "none";
                }
            }
        }
    }
}

/**
 * Retrieves and lists upcoming calendar events.
 *
 * @param {string} calendarId - The ID of the calendar to retrieve events from.
 * @returns {Promise<void>} - A promise that resolves when the events are listed.
 */
async function fetchCalendarEvents(calendarId) {
    await gapi.client.calendar.events
        .list({
            calendarId: calendarId,
            timeMin: new Date().toISOString(),
            showDeleted: false,
            singleEvents: true,
            orderBy: "startTime",
        })
        .then((response) => {
            if (response.result.items.length > 0) {
                // While adding events to the eventlist, also build a map of all participant names
                // so we can add them to the autocomplete list and the name filter checkboxes.
                let namesMap = new Map();
                for (const event of response.result.items) {
                    if (
                        event.summary.match(/^[🎶🎥😀🏈🎭🎉🎫] [A-Å]\w+: (.+)/u)
                    ) {
                        app.eventList.addEvent(event);

                        let matches = event.description.match(
                            /(?:Participants|Deltagere): (.+)/u
                        );
                        if (matches) {
                            let namesArray = matches[1].split(/,|og|and/);
                            let cleanedNames = namesArray
                                .map(function (name) {
                                    return name.trim();
                                })
                                .filter(function (name) {
                                    return name !== "";
                                });

                            cleanedNames.forEach(function (name) {
                                cleanedNames.forEach(function (name) {
                                    namesMap.set(name, true);
                                });
                            });
                        }

                        matches = event.summary.match(
                            /^[🎶🎥😀🏈🎭🎉🎫] [A-Å]\w+: (.+)/u
                        );
                        if (matches) {
                            autocompleteAdd("event_name", matches[1]);
                        }

                        if (event.location) {
                            autocompleteAdd("location", event.location);
                        }
                    }
                }

                // Add each participant to the autocomplete list
                namesMap.forEach(function (value, key) {
                    autocompleteAdd("participants", key);
                    namesMap.forEach(function (_, key) {
                        const id = `participant_show_${key}`;
                        if (!document.getElementById(id)) {
                            const checkbox = document.createElement("input");
                            checkbox.type = "checkbox";
                            checkbox.id = id;
                            checkbox.checked = true;
                            checkbox.addEventListener("change", filterNames);

                            document
                                .getElementById("filter_names_container")
                                .appendChild(checkbox);

                            const label = document.createElement("label");
                            label.htmlFor = checkbox.id;
                            label.textContent = key;
                            document
                                .getElementById("filter_names_container")
                                .appendChild(label);
                        }
                    });
                });
            }
        });
}

/**
 * Adds a calendar event to the specified calendar.
 *
 * @param {Object} event - The event object to be added.
 * @param {boolean} [reloadEvents=false] - Indicates whether to reload the events table after adding the event.
 * @returns {Promise<void>} - A promise that resolves when the event is added successfully.
 */
async function addCalendarEvent(event, calendarId) {
    const request = gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
    });
    return new Promise((resolve, reject) => {
        request.execute((event_response) => {
            if (event_response.error) {
                reject(event_response.error);
            }

            resolve(event_response);
        });
    });
}

/**
 * Adds a value to the autocomplete options for a given input field.
 * If the value already exists in the autocomplete options, it will not be added again.
 *
 * @param {string} input_id - The ID of the input field.
 * @param {string} value - The value to be added to the autocomplete options.
 * @param {string} [localStorage_item] - The name of the localStorage item to store the autocomplete options.
 *                                       If not provided, it will be generated based on the input ID.
 */
function autocompleteAdd(
    input_id,
    value,
    localStorage_item = `${input_id}_autocomplete`
) {
    if (value) {
        const locationAutocomplete = localStorage.getItem(localStorage_item);
        // Use a set to avoid duplicates
        const autocompleteOptions = locationAutocomplete
            ? new Set(JSON.parse(locationAutocomplete))
            : new Set();
        autocompleteOptions.add(value);
        localStorage.setItem(
            localStorage_item,
            JSON.stringify(Array.from(autocompleteOptions))
        );
    }
}

/**
 * Initializes an autocomplete functionality for a given input field.
 * @param {string} input_id - The ID of the input field.
 * @param {string} [localStorage_item] - The name of the localStorage item to store autocomplete values. Defaults to `${input_id}_autocomplete`.
 */
function autocomplete(
    input_id,
    localStorage_item = `${input_id}_autocomplete`
) {
    let input_elem = document.getElementById(input_id);
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    let currentFocus;
    /*execute a function when someone writes in the text field:*/
    input_elem.addEventListener("input", function (e) {
        let a,
            b,
            i,
            val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) {
            return false;
        }
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/

        const locationAutocomplete = localStorage.getItem(localStorage_item);
        const autocompleteItems = locationAutocomplete
            ? JSON.parse(locationAutocomplete)
            : [];

        for (i = 0; i < autocompleteItems.length; i++) {
            /*check if the item starts with the same letters as the text field value:*/
            if (
                autocompleteItems[i].substr(0, val.length).toUpperCase() ==
                val.toUpperCase()
            ) {
                /*create a DIV element for each matching element:*/
                b = document.createElement("DIV");
                /*make the matching letters bold:*/
                b.innerHTML =
                    "<strong>" +
                    autocompleteItems[i].substr(0, val.length) +
                    "</strong>";
                b.innerHTML += autocompleteItems[i].substr(val.length);
                /*insert a input field that will hold the current array item's value:*/
                b.innerHTML +=
                    "<input type='hidden' value='" +
                    autocompleteItems[i] +
                    "'>";
                /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function (e) {
                    /*insert the value for the autocomplete text field:*/
                    input_elem.value =
                        this.getElementsByTagName("input")[0].value;
                    /*close the list of autocompleted values,
                (or any other open lists of autocompleted values:*/
                    closeAllLists();
                });
                a.appendChild(b);
            }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    input_elem.addEventListener("keydown", function (e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
            /*If the arrow DOWN key is pressed, increase the currentFocus variable:*/
            currentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 38) {
            //up
            /*If the arrow UP key is pressed, decrease the currentFocus variable:*/
            currentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 13) {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            e.preventDefault();
            if (currentFocus > -1) {
                /*and simulate a click on the "active" item:*/
                if (x) x[currentFocus].click();
            }
        }
    });
    function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = x.length - 1;
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (let item of x) {
            item.classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document, except the one passed as an argument:*/
        let x = document.getElementsByClassName("autocomplete-items");
        for (let item of x) {
            if (elmnt != item && elmnt != input_elem) {
                item.parentNode.removeChild(item);
            }
        }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}
