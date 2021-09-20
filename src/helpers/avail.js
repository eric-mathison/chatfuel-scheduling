const { google } = require("googleapis");
const auth = require("./auth");
const logger = require("../config/logger");

const calendar = google.calendar("v3");

// Get Free Busy dates in UTC from Google Calendar API
// Requires datestring and calendar id
const avail = (fromDate, toDate, calID) =>
    new Promise((resolve, reject) => {
        logger.debug("From Date:", fromDate);
        logger.debug("To Date: ", toDate);

        calendar.freebusy.query(
            {
                auth,
                resource: {
                    timeMin: new Date(fromDate).toISOString(),
                    timeMax: new Date(toDate).toISOString(),
                    items: [
                        {
                            id: calID,
                        },
                    ],
                },
            },
            (err, response) => {
                if (err) {
                    logger.error(`The API returned an error: ${err}`);
                    reject(err);
                } else {
                    resolve(response.data.calendars[calID].busy);
                }
            }
        );
    });

module.exports = avail;
