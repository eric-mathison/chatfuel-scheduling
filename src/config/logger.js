const { createLogger, format, transports } = require("winston");

const level = process.env.LOG_LEVEL || "debug";

const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.colorize(),
        format.simple()
    ),
    transports: [
        new transports.Console({
            level,
        }),
    ],
});

module.exports = logger;
