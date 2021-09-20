const express = require("express");
const moment = require("moment");
const logger = require("../config/logger");

const timezone = require("../helpers/timezone");
const { addevent, updateevent, deleteevent } = require("../helpers/events");
const avail = require("../helpers/avail");

const router = express();

router.use(express.urlencoded({ extented: false }));
router.use(express.json());

router.post("/gettimezone", (req, res) => {
    const { calendarId } = req.body;

    if (!calendarId) {
        logger.error("Missing post data");
        res.status(400).send();
    } else {
        timezone(calendarId)
            .then((r1) => {
                const calTimezone = r1;
                logger.debug(`Got timezone: ${calTimezone}`);
                res.send(calTimezone);
            })
            .catch((err) => {
                logger.error(`Failed to get timezone: ${err}`);
                res.status(400).json({
                    error: `${err}`,
                });
            });
    }
});

router.post("/getavail", (req, res) => {
    const { calendarId, fromDate, toDate } = req.body;

    if (!fromDate || !toDate || !calendarId) {
        logger.error("Missing post data");
        res.status(400).send();
    } else {
        avail(fromDate, toDate, calendarId)
            .then((r1) => {
                // logger.debug(JSON.stringify(r1));
                res.send(r1);
            })
            .catch((err) => {
                logger.error(`Failed to get availability: ${err}`);
                res.status(400).json({
                    error: `${err}`,
                });
            });
    }
});

router.post("/addevent", (req, res) => {
    const {
        eventTitle,
        eventDescription,
        eventStatus,
        eventFromDate,
        eventToDate,
        eventStartTime,
        eventEndTime,
        calendarId,
        userTimezone,
    } = req.body;

    if (
        !calendarId ||
        !eventTitle ||
        !eventFromDate ||
        !eventToDate ||
        !eventStartTime ||
        !eventEndTime
    ) {
        // eslint-disable-line
        logger.error("Missing post data");
        logger.debug(
            "eventTitle",
            eventTitle,
            "\neventDescription",
            eventDescription,
            "\neventStatus",
            eventStatus,
            "\neventFromDate",
            eventFromDate,
            "\neventToDate",
            eventToDate,
            "\neventStartTime",
            eventStartTime,
            "\neventEndTime",
            eventEndTime
        );
        res.status(400).send();
    } else {
        timezone(calendarId)
            .then((r1) => {
                logger.debug(`Calendar returned timezone ${r1}`);

                logger.debug(`Event from date: ${eventFromDate}`);
                logger.debug(`Event start: ${eventStartTime}`);
                logger.debug(`Event to date: ${eventToDate}`);
                logger.debug(`Event end: ${eventEndTime}`);
                // Selected time in user timezone
                const userTimeZone = userTimezone;
                const userSelectedStartTime = moment.tz(
                    `${eventFromDate} ${moment(eventStartTime, "h:mm a").format(
                        "HH:mm"
                    )}`,
                    userTimeZone
                );
                const userSelectedEndTime = moment.tz(
                    `${eventToDate} ${moment(eventEndTime, "h:mm a").format(
                        "HH:mm"
                    )}`,
                    userTimeZone
                );
                logger.debug(
                    `User selected start time: ${userSelectedStartTime.format()}`
                );
                logger.debug(
                    `User selected end time: ${userSelectedEndTime.format()}`
                );

                // Selected time in UTC
                const utcSelectedStartTime =
                    userSelectedStartTime.tz("Etc/UTC");
                const utcSelectedEndTime = userSelectedEndTime.tz("Etc/UTC");
                logger.debug(
                    `UTC start time: ${utcSelectedStartTime.format()}`
                );
                logger.debug(`UTC end time: ${utcSelectedEndTime.format()}`);

                // Selected time in Google Calendar timezone
                const eventStartDateTime = utcSelectedStartTime.tz(r1);
                const eventEndDateTime = utcSelectedEndTime.tz(r1);
                logger.debug(
                    `Start Time in ${r1}: ${eventStartDateTime.format()}`
                );
                logger.debug(`End Time in ${r1}: ${eventEndDateTime.format()}`);

                // Clear eventDescription if undefined
                let eventDesc = eventDescription;
                if (eventDescription === "undefined") {
                    eventDesc = "";
                }

                // Append eventTitle if status is defined
                let eventSummary = `${eventTitle}`;
                let colorId;
                if (eventStatus !== "" && eventStatus !== "undefined") {
                    eventSummary = `${eventTitle} - ${eventStatus}`;
                    colorId = "10";
                }

                // return addevent();
                return addevent(
                    eventSummary,
                    eventDesc,
                    colorId,
                    eventStartDateTime,
                    eventEndDateTime,
                    r1,
                    calendarId
                ); // eslint-disable-line
            })
            .then((r2) => {
                const eventId = r2.data.id;
                logger.debug(`New Event Created: ${eventTitle} ${eventId}`);
                res.json({
                    eventId,
                });
            })
            .catch((err) => {
                logger.error(`Failed to create event: ${err}`);
                res.status(400).json({
                    error: `${err}`,
                });
            });
    }
});

router.post("/updateevent", (req, res) => {
    const { emailAddress, eventDescription, eventStatus, calendarId, eventId } =
        req.body;

    if (!calendarId || !eventId) {
        logger.error("Missing Post data");
        res.status(400).send();
    } else {
        updateevent(
            emailAddress,
            eventDescription,
            eventStatus,
            calendarId,
            eventId
        )
            .then(() => {
                logger.debug("Event Successfully updated");
                res.status(200).send();
            })
            .catch((err) => {
                logger.error(`Failed to update event: ${err}`);
                res.json({
                    set_attributes: {
                        error: `${err}`,
                    },
                    redirect_to_blocks: ["Schedule Error"],
                });
            });
    }
});

router.post("/deleteevent", (req, res) => {
    const { calendarId, eventId } = req.body;

    logger.debug(`Removing EventID: ${eventId}`);

    if (!calendarId || !eventId) {
        logger.error("Missing Post data");
        res.status(400).send();
    } else {
        deleteevent(eventId, calendarId)
            .then((response) => {
                if (!response) {
                    logger.info("No response from Google API");
                } else {
                    logger.debug("Event Cancelled Successfully");
                    res.json({ set_attributes: { eventId: "cleared" } });
                }
            })
            .catch((err) => {
                logger.error(`Failed to cancel event: ${err}`);
                res.json({
                    set_attributes: {
                        error: `${err}`,
                    },
                    redirect_to_blocks: ["Schedule Error"],
                });
            });
    }
});

module.exports = router;
