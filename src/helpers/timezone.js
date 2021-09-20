const { google } = require("googleapis");
const auth = require("./auth");
const logger = require("../config/logger");

const calendar = google.calendar("v3");

// get timezone from Google Calendar
const timezone = (calID) =>
    new Promise((resolve, reject) => {
        calendar.calendars.get(
            {
                auth,
                calendarId: calID,
            },
            (err, response) => {
                if (err) {
                    logger.error(`The API returned an error: ${err}`);
                    reject(err);
                } else {
                    const timezoneRes = response.data.timeZone;
                    resolve(timezoneRes);
                }
            }
        );
    });

module.exports = timezone;
