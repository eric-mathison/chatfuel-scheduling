const express = require("express");
const axios = require("axios");
const logger = require("../config/logger");

const router = express();

router.use(express.urlencoded({ extended: false }));
router.use(express.json());

router.post("/getwebview", (req, res) => {
    logger.debug(JSON.stringify(req.body));
    const domain = req.headers.host;
    const {
        "messenger user id": userId,
        botId,
        broadcastId,
        gotoBlock,
        calendarId,
        fbPixelId = 0,
        bookingStartTime,
        bookingEndTime,
        bufferTime,
        enableDoubleBooking,
        bookingType,
        bookingDays,
        eventTitle,
        eventDescription,
        eventStatus,
        eventDurationMin,
        eventDurationMax,
        enableAMPM,
        enableRealSlots,
        // v1.4.0
        calOpenHeading = "Schedule your Appointment",
        calOpenButton = "Choose your Date",
        windowHeight = "full",
        windowTitle = "Scheduling",
        calendarHeading = "Choose a date:",
        backButton = "Choose a different date",
        timeStartLabel = "Choose a time:",
        timeEndLabel = "Choose your duration:",
        showTimeZone = "show",
        sessionNotice = "",
        premiumId,
        // v1.5.0
        hexColor,
        hexHoverColor,
        timeStep,
        // v1.7.0
        startingBuffer = 0,
        doneButton = "Done",
        // v1.8.0
        language = "en",
    } = req.body;

    const url = `https://${domain}/v1/schedule?userId=${userId}&botId=${botId}&broadcastId=${broadcastId}&gotoBlock=${gotoBlock}&calendarId=${calendarId}&fbPixelId=${fbPixelId}&bookingStartTime=${bookingStartTime}&bookingEndTime=${bookingEndTime}&bufferTime=${bufferTime}&enableDoubleBooking=${enableDoubleBooking}&bookingType=${bookingType}&bookingDays=${bookingDays}&eventTitle=${eventTitle}&eventDescription=${eventDescription}&eventStatus=${eventStatus}&eventDurationMin=${eventDurationMin}&eventDurationMax=${eventDurationMax}&enableAMPM=${enableAMPM}&enableRealSlots=${enableRealSlots}&windowTitle=${windowTitle}&calendarHeading=${calendarHeading}&backButton=${backButton}&timeStartLabel=${timeStartLabel}&timeEndLabel=${timeEndLabel}&showTimeZone=${showTimeZone}&sessionNotice=${sessionNotice}&premiumId=${premiumId}&hexColor=${hexColor}&hexHoverColor=${hexHoverColor}&timeStep=${timeStep}&startingBuffer=${startingBuffer}&doneButton=${doneButton}&language=${language}`;

    res.json({
        messages: [
            {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text: calOpenHeading,
                        buttons: [
                            {
                                type: "web_url",
                                url,
                                title: calOpenButton,
                                messenger_extensions: true,
                                webview_height_ratio: windowHeight,
                                webview_share_button: "hide",
                                fallback_url: `${url}&fallback=true`,
                            },
                        ],
                    },
                },
            },
        ],
    });
});

router.post("/cfbroadcast", (req, res) => {
    const {
        botId,
        userId,
        broadcastId,
        gotoBlock,
        error,
        eventId,
        eventDateFormatted,
        eventStartTime,
        eventEndTime,
        eventDuration,
        userTimezone,
        ipAddress,
        latitude,
        longitude,
        city,
        regionCode,
        zipCode,
        countryCode,
    } = req.body;

    logger.debug(JSON.stringify(req.body));

    const options = {
        url: `https://api.chatfuel.com/bots/${botId}/users/${userId}/send?chatfuel_token=${broadcastId}&chatfuel_block_name=${gotoBlock}&error=${error}&eventId=${eventId}&eventDateFormatted=${eventDateFormatted}&eventStartTime=${eventStartTime}&eventEndTime=${eventEndTime}&eventDuration=${eventDuration}&userTimezone=${userTimezone}&ca_ipAddress=${ipAddress}&ca_latitude=${latitude}&ca_longitude=${longitude}&ca_city=${city}&ca_regionCode=${regionCode}&ca_zipCode=${zipCode}&ca_countryCode=${countryCode}`,
        method: "post",
        headers: {
            "Content-Type": "application/json",
        },
    };

    axios(options)
        .then((response) => {
            logger.debug("Chatfuel broadcast success");
            logger.debug("Broadcast Response:", response.data);
            res.send(response.data);
        })
        .catch((err) => {
            logger.error(`Broadcast Error: ${err.message}`);
            res.status(400).send(err.message);
        });
});

router.get("/getlocation", (req, res) => {
    const { ipAddress } = req.query;
    logger.debug(`IP Address: ${ipAddress}`);

    const options = {
        url: `http://api.ipstack.com/${ipAddress}?access_key=${process.env.IPSTACK_API_KEY}&fields=main`,
        method: "get",
    };

    axios(options)
        .then((response) => {
            logger.debug(JSON.stringify(response.data));
            res.send(response.data);
        })
        .catch((err) => {
            logger.error(`Broadcast Error: ${err.message}`);
            res.status(400).send(err.message);
        });
});

module.exports = router;
