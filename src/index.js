require("dotenv").config();
const express = require("express");
const hbs = require("hbs");
const path = require("path");
const morgan = require("morgan");
const logger = require("./config/logger");

const calendarapi = require("./routes/calendarapi");
const hook = require("./routes/hook");

const app = express();
const port = process.env.PORT || 3000;

app.set("trust proxy", true);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

hbs.registerHelper("json", (context) => JSON.stringify(context));

app.use(
    morgan("common", {
        skip: (req, res) => res.statusCode < 400,
        stream: process.stderr,
    })
);

app.use(
    morgan("common", {
        skip: (req, res) => res.statusCode >= 400,
        stream: process.stdout,
    })
);

app.get("/", (req, res) => {
    res.status(200).send({ message: "listening" });
});

app.get("/v1/schedule", (req, res) => {
    if (Object.keys(req.query).length === 0) {
        res.status(400).send("No parametes sent");
    } else {
        const { hexColor, hexHoverColor } = req.query;
        let hex = "#1E88E5";
        let hexHover = "#1565C0";

        const validateHex = (color) =>
            /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);

        if (hexColor) {
            if (validateHex(`#${hexColor}`)) {
                logger.debug("Valid Hex Color", hexColor);
                hex = `#${hexColor}`;
            }
        }

        if (hexHoverColor) {
            if (validateHex(`#${hexHoverColor}`)) {
                logger.debug("Valid Hex Hover Color", hexHoverColor);
                hexHover = `#${hexHoverColor}`;
            }
        }

        res.render("webview.hbs", {
            query: req.query,
            fbPixelId: req.query.fbPixelId,
            hex,
            hexHover,
        });
    }
});

app.use("/v1/calendarapi", calendarapi);
app.use("/v1/hook", hook);

app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send("Sorry, our flock is not flying together");
});

app.use((req, res, next) => {
    logger.error("404 page requested");
    res.status(404).send("This page is not found - Error 404");
});

app.listen(port, () => {
    logger.info(`Listening on Port ${port}`);
});
