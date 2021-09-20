const { google } = require("googleapis");
const Isemail = require("isemail");
const auth = require("./auth");
const logger = require("../config/logger");

const calendar = google.calendar("v3");

const sanitizetext = (text) => {
    const originalText = text;
    const sanitizedText = originalText.replace(/\s?\|\s?/g, "\n");
    return sanitizedText;
};

// create event in Google Calendar using the timezone set in Google Calendar
const addevent = (
    summary,
    description = "",
    colorId,
    startDateTime,
    endDateTime,
    timezone,
    calID
) =>
    new Promise((resolve, reject) => {
        logger.debug("Add Event Description:", description);
        let sanitizedDescription;
        if (description !== "") {
            sanitizedDescription = sanitizetext(description);
        }

        const event = {
            summary,
            description: sanitizedDescription,
            colorId,
            start: {
                dateTime: startDateTime, // DateTime String
                timeZone: timezone, // Timezone of Calendar
            },
            end: {
                dateTime: endDateTime, // DateTime String
                timeZone: timezone, // Timezone of Calendar
            },
        };
        calendar.events.insert(
            {
                auth,
                calendarId: calID,
                resource: event,
            },
            (err, response) => {
                if (err) {
                    logger.error(`The API returned an error: ${err}`);
                    reject(err);
                } else {
                    logger.debug("Event created successfully");
                    resolve(response);
                }
            }
        );
    });

// update event in Google Calendar passing either email address or a status
const updateevent = (
    emailAddress = "",
    eventDescription = "",
    eventStatus = "",
    calID,
    eventId
) =>
    new Promise((resolve, reject) => {
        calendar.events.get(
            {
                auth,
                calendarId: calID,
                eventId,
            },
            (getErr, getRes) => {
                if (getErr) {
                    logger.error(`The Get API returned an error: ${getErr}`);
                    reject(getErr);
                } else {
                    let attendees;
                    let updateDescription;
                    let updateStatus;
                    let updateColor;

                    logger.debug("Update Event Description:", eventDescription);

                    if (emailAddress !== "") {
                        if (!Isemail.validate(emailAddress)) {
                            const emailErr = new Error(
                                `${emailAddress} is not a valid email address`
                            );
                            logger.error(emailErr);
                            reject(emailErr);
                        }
                        attendees = [
                            {
                                email: emailAddress,
                                responseStatus: "accepted",
                            },
                        ];
                    }
                    if (eventDescription !== "") {
                        // updateDescription = `${getRes.data.description}\n${eventDescription}`;
                        logger.debug(
                            "Original Description:",
                            getRes.data.description
                        );
                        const calDescription = getRes.data.description;
                        let previousDesc = "";
                        if (calDescription !== undefined) {
                            previousDesc = `${calDescription}\n`;
                        }
                        updateDescription = `${previousDesc}${sanitizetext(
                            eventDescription
                        )}`;
                    }
                    if (eventStatus !== "") {
                        const currentSummary = getRes.data.summary;
                        updateStatus = `${currentSummary
                            .split("-")[0]
                            .trim()} - ${eventStatus}`;
                        updateColor = "10";
                    }
                    const event = {
                        attendees,
                        summary: updateStatus,
                        description: updateDescription,
                        colorId: updateColor,
                    };

                    calendar.events.patch(
                        {
                            auth,
                            calendarId: calID,
                            eventId,
                            resource: event,
                        },
                        (err, response) => {
                            if (err) {
                                logger.error(
                                    `The API returned an error: ${err}`
                                );
                                reject(err);
                            } else {
                                logger.debug(
                                    `Event Updated: ${JSON.stringify(event)}`
                                );
                                resolve(response);
                            }
                        }
                    );
                }
            }
        );
    });

const deleteevent = (eventId, calID) =>
    new Promise((resolve, reject) => {
        calendar.events.patch(
            {
                auth,
                calendarId: calID,
                eventId,
                resource: {
                    status: "cancelled",
                },
            },
            (err, response) => {
                if (err) {
                    logger.error(`The API returned an error: ${err}`);
                    reject(err);
                } else {
                    logger.debug("Event cancelled successfully");
                    resolve(response);
                }
            }
        );
    });

module.exports = { addevent, updateevent, deleteevent };
