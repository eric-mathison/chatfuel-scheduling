const { google } = require("googleapis");
const key = require("../../googleapikey.json");
const logger = require("../config/logger");

const jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, [
    "https://www.googleapis.com/auth/calendar",
]);

jwtClient.authorize((err) => {
    if (err) {
        logger.error(err);
    }
});

module.exports = jwtClient;
