function initClient() {
    gapi.load("client:auth2", function () {
        gapi.auth2.init({
            client_id:
                "550349020422-m8h9na45b8abctrht36fsqadaueaqfrn.apps.googleusercontent.com",
            scope: "https://www.googleapis.com/auth/calendar",
        });
    });
}

function authorize() {
    gapi.auth2.getAuthInstance().signIn();
}

function addTask() {
    var taskTitle = document.getElementById("taskTitle").value;
    var taskDate = document.getElementById("taskDate").value;
    var taskTime = document.getElementById("taskTime").value;

    var event = {
        summary: taskTitle,
        start: {
            dateTime: taskDate + "T" + taskTime + ":00-07:00",
            timeZone: "America/Los_Angeles",
        },
        end: {
            dateTime: taskDate + "T" + taskTime + ":00-07:00",
            timeZone: "America/Los_Angeles",
        },
    };

    var calendarId = "primary";

    gapi.client.calendar.events
        .insert({
            calendarId: calendarId,
            resource: event,
        })
        .then(function (response) {
            console.log("Event created: " + response.result.id);
        });
}
