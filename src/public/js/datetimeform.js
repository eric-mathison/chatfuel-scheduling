/* global query, selected_date, time_start, moment, time_end, MessengerExtensions, fbq */

window.extAsyncInit = function e() {
    // the Messenger Extensions JS SDK is done loading
    console.log("extensions loaded");
};

// convert string days to numerical days
const convertDays = (weekDays) => {
    if (weekDays) {
        const s = weekDays;
        const m = s.split(", ");

        const day = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        day.sun = 0;
        day.mon = 1;
        day.tue = 2;
        day.wed = 3;
        day.thu = 4;
        day.fri = 5;
        day.sat = 6;

        const d = [];
        for (let i = 0; i <= m.length; i += 1) {
            const n = day[m[i]];
            d.push(n);
        }
        return d;
    }
    return [];
};

// find relational day in selected month
const getRelationalDate = (currentDate, relation, day) => {
    const relationalDate = moment(currentDate)
        .startOf("month")
        .startOf("week")
        .day(day);

    if (relationalDate.month() !== moment(currentDate).month()) {
        relationalDate.add(1, "w");
    }
    if (relation === "second") {
        relationalDate.add(7, "d");
    }
    if (relation === "third") {
        relationalDate.add(14, "d");
    }
    if (relation === "fourth") {
        relationalDate.add(21, "d");
    }
    if (relation === "fifth") {
        relationalDate.add(28, "d");
    }
    if (relationalDate.month() === moment(currentDate).month()) {
        return relationalDate;
    }

    return [];
};

// creates an array of dates the datepicker should be enabled for
// uses the frequency setting from the query sent from the chatbot
// runs before displaying days in datepicker
const showOpenDates = (date) => {
    if (query.bookingType === "weekly") {
        const days = convertDays(query.bookingDays);
        return days.indexOf(date.getDay()) > -1;
    }

    if (
        query.bookingType === "fortnightly" ||
        query.bookingType === "biweekly"
    ) {
        const days = query.bookingDays;
        const daysArr = days.split(", ");
        const resultArr = [];
        for (let i = 0; i < daysArr.length; i += 1) {
            let z = 0;
            const startDate = moment(new Date(daysArr[i]));
            while (z < 24) {
                const newDate = startDate.add(14, "day");
                resultArr.push(newDate.toISOString());
                z += 1;
            }
        }
        return resultArr.indexOf(date.toISOString()) > -1;
    }

    if (query.bookingType === "monthly") {
        // need function to determine if days are numeric or relational
        const days = query.bookingDays;

        const hasNumbers = (string) => {
            const regex = /\d/g;
            return regex.test(string);
        };

        if (hasNumbers(days)) {
            const dateArr = JSON.parse(`[${days}]`);
            return dateArr.indexOf(date.getDate()) > -1;
        }
        if (!hasNumbers(days)) {
            const daysArr = days.split(", ");
            const resultArr = [];
            for (let i = 0; i < daysArr.length; i += 1) {
                const relationArr = daysArr[i].split(" ");
                const relation = relationArr[0];
                const day = relationArr[1];
                const result = getRelationalDate(date, relation, day).date();
                resultArr.push(result);
            }
            return resultArr.indexOf(date.getDate()) > -1;
        }
    }
    return [];
};

// fromDate and toDate need to be UTC time
const getBusyTimes = async (fromDate, toDate) => {
    const result = await $.ajax({
        type: "POST",
        url: "/v1/calendarapi/getavail",
        data: {
            calendarId: query.calendarId,
            fromDate,
            toDate,
        },
        dataType: "json",
    });
    return result;
};

const getIP = async () => {
    const result = await $.ajax({
        type: "GET",
        url: "https://api.ipify.org/",
    });
    return result;
};

const getLocation = async (ipAddress) => {
    const result = await $.ajax({
        type: "GET",
        url: "/v1/hook/getlocation",
        data: {
            ipAddress,
        },
    });
    return result;
};

// rounds current time to nearest future interval time
// defaults to 30 minute interval if not specified
// ie. 14:23 would round to 14:30
const roundMinutes = (time, interval = 30) => {
    const m = time;
    const currMinute = m.minute();
    const roundedMinute = Math.ceil(currMinute / interval) * interval;
    const newTime = m.startOf("hour").add(roundedMinute, "m");
    return newTime;
};

const toUniversalTime = (time) => {
    if (time === moment(time, "h:mm a").format("h:mm a")) {
        const convertTime = moment(time, "h:mm a").format("HH:mm");
        return convertTime;
    }
    return time;
};

const getCalTimezone = () => {
    const getTZ = () =>
        $.ajax({
            type: "POST",
            dataType: "text",
            url: "/v1/calendarapi/gettimezone",
            data: {
                calendarId: query.calendarId,
            },
        });

    return getTZ()
        .then((response) => response)
        .fail((err) => {
            const error = JSON.parse(err.responseText);
            return error;
        });
};

const parseDate = (date) => {
    const parsed = Date.parse(date);
    if (!Number.isNaN(parsed)) {
        return parsed;
    }
    return Date.parse(
        toUniversalTime(date)
            .replace(/-/g, "/")
            .replace(/[a-z]+/gi, " ")
    );
};

// adds specified minutes to a date
const addMinutes = (date, time, minutes) => {
    const d = parseDate(`${date} ${time}`);
    const addMin = moment(d).add(minutes, "m");
    const addedTime = moment(addMin).format("HH:mm");
    return addedTime;
};

// calculate time end value options
const getTimeEndTime = (currentAvailableTimes) => {
    const selectedTime = moment(
        `${selected_date.value} ${toUniversalTime(time_start.value)}`
    ).format();

    const filter = currentAvailableTimes.filter((slot) =>
        moment(selectedTime).isBetween(slot.start, slot.end, null, "[]")
    );

    const maxDurationTime = moment(selectedTime).add(
        parseInt(query.eventDurationMax, 10),
        "minutes"
    );

    let maxTime = moment(filter[0].end)
        .clone()
        .subtract(parseInt(query.bufferTime, 10), "minutes");

    if (maxTime.minutes() === (29 || 59)) {
        maxTime = maxTime.add("1", "minute");
    }

    const endTime = maxDurationTime.isBefore(maxTime)
        ? maxDurationTime.format("HH:mm")
        : maxTime.format("HH:mm");

    return endTime;
};

// adjust time end input interval
const getIntervalTime = () => {
    if (query.eventDurationMin && query.eventDurationMax) {
        const intTime = addMinutes(
            selected_date.value,
            toUniversalTime(time_start.value),
            query.eventDurationMin
        ); // eslint-disable-line
        return intTime;
    }
    const intTime = addMinutes(selected_date.value, time_start.value, 30);
    return intTime;
};

const getTimeFormat = (isPhpTime) => {
    if (query.enableAMPM === "yes" && isPhpTime === "yes") {
        const result = "g:i a";
        return result;
    }
    if (query.enableAMPM === "yes") {
        const result = "h:mm a";
        return result;
    }
    if (isPhpTime === "yes") {
        const result = "H:i";
        return result;
    }
    const result = "HH:mm";
    return result;
};

const getStepInt = () => {
    if (query.enableRealSlots === "yes") {
        const stepInt =
            parseInt(query.bufferTime, 10) +
            parseInt(query.eventDurationMax, 10);
        return stepInt;
    }
    const stepInt = !["undefined", ""].includes(query.timeStep)
        ? query.timeStep
        : Math.min(query.eventDurationMin, 30);
    // console.log(stepInt);
    return stepInt;
};

const getDateRange = (month) => {
    const beginningDayOfMonth = moment(month).startOf("month");
    const lastDayOfMonth = moment(month).endOf("month");
    const dateRangeStart = moment(beginningDayOfMonth).subtract("10", "days");
    const dateRangeEnd = moment(lastDayOfMonth).add("10", "days");
    return [dateRangeStart, dateRangeEnd];
};

console.log(query.language);
// configure datepicker
// loads the showOpenDates function before displaying days
$("#datepicker").datepicker({
    format: "yyyy-mm-dd",
    language: query.language,
    todayHighlight: true,
    startDate: new Date(),
    maxViewMode: 1,
    beforeShowDay: (date) => {
        if (showOpenDates(date)) {
            return true;
        }
        return false;
    },
    disableTouchKeyboard: true,
    updateViewDate: false,
});

const getAvailableTimes = (events, startingDate, endingDate, calTimezone) => {
    const availableTimes = [];
    const spannedDates = [];
    const fixBookingEndTime =
        query.bookingEndTime === "00:00" ? "23:59" : query.bookingEndTime;

    while (startingDate.add(1, "day").diff(endingDate) < 0) {
        const calStartTime = moment.tz(
            `${moment(startingDate).format("YYYY-MM-DD")} ${
                query.bookingStartTime
            }`,
            calTimezone
        );
        const calEndTime = moment.tz(
            `${moment(startingDate).format("YYYY-MM-DD")} ${fixBookingEndTime}`,
            calTimezone
        );

        let hasEvent = 0;

        events.forEach((event, index) => {
            const eventStart = moment.tz(
                moment(event.start).utc(),
                calTimezone
            );
            const eventEnd = moment.tz(moment(event.end).utc(), calTimezone);

            if (eventStart.isSame(calStartTime, "day")) {
                if (eventEnd.isAfter(calEndTime.clone().endOf("day"))) {
                    spannedDates.push({
                        start: eventStart.format(),
                        end: eventEnd.format(),
                    });
                }

                const found = spannedDates.find(
                    (element) =>
                        moment(element.end).isBefore(eventStart) &&
                        moment(element.end).isSame(eventStart, "day")
                );

                if (
                    found &&
                    !availableTimes.some(
                        (item) =>
                            item.start ===
                            moment.tz(found.end, calTimezone).format()
                    )
                ) {
                    if (
                        moment
                            .tz(found.end, calTimezone)
                            .isSameOrAfter(calStartTime)
                    ) {
                        availableTimes.push({
                            start: moment.tz(found.end, calTimezone).format(),
                            end: eventStart.format(),
                            block: 0,
                        });
                    }
                }

                if (
                    eventStart.isSameOrBefore(calStartTime) &&
                    eventEnd.isSameOrAfter(calEndTime)
                ) {
                    // All day event has been found
                    hasEvent = 1;
                    return;
                }

                if (query.enableDoubleBooking === "yes") {
                    return;
                }

                if (eventStart.isSameOrBefore(calStartTime)) {
                    if (events[index + 1]) {
                        if (
                            !moment
                                .tz(
                                    moment(events[index + 1].start).utc(),
                                    calTimezone
                                )
                                .isSameOrBefore(calEndTime)
                        ) {
                            if (eventEnd.isSameOrBefore(calStartTime)) {
                                availableTimes.push({
                                    start: calStartTime.format(),
                                    end: calEndTime.format(),
                                    block: 1,
                                });
                            } else {
                                availableTimes.push({
                                    start: eventEnd.format(),
                                    end: calEndTime.format(),
                                    block: 2,
                                });
                            }
                        } else if (
                            moment
                                .tz(
                                    moment(events[index + 1].start).utc(),
                                    calTimezone
                                )
                                .isAfter(calStartTime) &&
                            moment
                                .tz(
                                    moment(events[index + 1].start).utc(),
                                    calTimezone
                                )
                                .isSameOrBefore(calEndTime)
                        ) {
                            if (eventEnd.isAfter(calStartTime)) {
                                availableTimes.push({
                                    start: eventEnd.format(),
                                    end: moment
                                        .tz(
                                            moment(
                                                events[index + 1].start
                                            ).utc(),
                                            calTimezone
                                        )
                                        .format(),
                                    block: 4,
                                });
                            }
                        }
                    } else if (eventEnd.isAfter(calStartTime)) {
                        availableTimes.push({
                            start: eventEnd.format(),
                            end: calEndTime.format(),
                            block: 5,
                        });
                    } else {
                        availableTimes.push({
                            start: calStartTime.format(),
                            end: calEndTime.format(),
                            block: "5a",
                        });
                    }
                } else if (
                    eventStart.isAfter(calStartTime) &&
                    eventStart.isBefore(calEndTime)
                ) {
                    if (events[index - 1]) {
                        if (
                            !moment
                                .tz(
                                    moment(events[index - 1].end).utc(),
                                    calTimezone
                                )
                                .isSameOrAfter(calStartTime)
                        ) {
                            availableTimes.push({
                                start: calStartTime.format(),
                                end: eventStart.format(),
                                block: 6,
                            });
                        }
                    } else {
                        availableTimes.push({
                            start: calStartTime.format(),
                            end: eventStart.format(),
                            block: 7,
                        });
                    }

                    if (events[index + 1]) {
                        if (
                            !moment
                                .tz(
                                    moment(events[index + 1].start).utc(),
                                    calTimezone
                                )
                                .isSameOrBefore(calEndTime)
                        ) {
                            if (eventEnd.isBefore(calEndTime)) {
                                availableTimes.push({
                                    start: eventEnd.format(),
                                    end: calEndTime.format(),
                                    block: 8,
                                });
                            }
                        } else {
                            availableTimes.push({
                                start: eventEnd.format(),
                                end: moment
                                    .tz(
                                        moment(events[index + 1].start).utc(),
                                        calTimezone
                                    )
                                    .format(),
                                block: 9,
                            });
                        }
                    } else if (eventEnd.isSameOrBefore(calEndTime)) {
                        availableTimes.push({
                            start: eventEnd.format(),
                            end: calEndTime.format(),
                            block: 10,
                        });
                    }
                } else if (
                    eventStart.isSameOrAfter(calEndTime) &&
                    eventEnd.isAfter(calEndTime)
                ) {
                    if (events[index - 1]) {
                        if (
                            !moment
                                .tz(
                                    moment(events[index - 1].start).utc(),
                                    calTimezone
                                )
                                .isSame(calStartTime, "day")
                        ) {
                            availableTimes.push({
                                start: calStartTime.format(),
                                end: calEndTime.format(),
                                block: 11,
                            });
                        }
                    } else if (!events[index - 1]) {
                        availableTimes.push({
                            start: calStartTime.format(),
                            end: calEndTime.format(),
                            block: 12,
                        });
                    }
                }

                hasEvent = 1;
            }
        }, []);

        spannedDates.forEach((dateRange) => {
            if (calStartTime.isBetween(dateRange.start, dateRange.end)) {
                if (
                    moment
                        .tz(dateRange.end, calTimezone)
                        .isBefore(calEndTime) &&
                    !availableTimes.some(
                        (item) =>
                            item.start ===
                            moment.tz(dateRange.end, calTimezone).format()
                    )
                ) {
                    availableTimes.push({
                        start: moment.tz(dateRange.end, calTimezone).format(),
                        end: calEndTime.format(),
                        block: "spanned",
                    });
                }
                hasEvent = 1;
            }
        });

        if (hasEvent === 0) {
            availableTimes.push({
                start: calStartTime.format(),
                end: calEndTime.format(),
            });
        }
    }
    return availableTimes;
};

const filterAvailableTimesForEvent = (
    availability, // available times converted to user timezone
    userTimezone,
    localStartingTime,
    eventDuration,
    bufferTime
) => {
    const result = availability.filter((range) => {
        const rangeStartTime =
            moment.tz(range.start, userTimezone).format("HH:mm") ===
            localStartingTime
                ? parseInt(bufferTime, 10) + parseInt(eventDuration, 10)
                : 2 * parseInt(bufferTime, 10) + parseInt(eventDuration, 10);
        return (
            moment
                .duration(
                    moment
                        .tz(range.end, userTimezone)
                        .diff(moment.tz(range.start, userTimezone))
                )
                .asMinutes() >= rangeStartTime &&
            moment.tz(range.end, userTimezone) >=
                moment
                    .tz(moment(), userTimezone)
                    .add(query.startingBuffer, "m")
                    .add(
                        parseInt(query.eventDurationMin, 10) +
                            parseInt(query.bufferTime, 10),
                        "minutes"
                    )
        );
    });
    return result;
};

const convertTimesToUserTz = (datesArray, userTimezone) => {
    const converted = [];
    datesArray.forEach((object) => {
        const localStartTime = moment.tz(object.start, userTimezone);
        const localEndTime = moment.tz(object.end, userTimezone);
        const startOfDay = localEndTime.clone().startOf("day");
        const endOfDay = localStartTime.clone().endOf("day");

        if (localEndTime > endOfDay) {
            converted.push({
                start: localStartTime.format(),
                end: endOfDay.format(),
            });
            if (localEndTime.format("HH:mm") !== "00:00") {
                converted.push({
                    start: startOfDay.format(),
                    end: localEndTime.format(),
                });
            }
        } else {
            converted.push({
                start: localStartTime.format(),
                end: localEndTime.format(),
            });
        }
    });
    return converted;
};

const getDisabledDates = (
    datesArray, // eventAvailableDates
    startingDate,
    endingDate,
    userTimezone
) => {
    const disabledDates = [];
    while (startingDate.add(1, "day").diff(endingDate) < 0) {
        const found = datesArray.some((range) =>
            moment.tz(range.start, userTimezone).isSame(startingDate, "day")
        );
        if (!found) {
            disabledDates.push(
                moment
                    .tz(startingDate.clone().startOf("day"), userTimezone)
                    .format("YYYY-MM-DD")
            );
        }
    }
    return disabledDates;
};

let eventAvailableTimes = [];
let calTimezone = "";
let location = "";

$(document).ready(async () => {
    $("a.done").removeClass("clickable");

    const selectedMonthDate = moment();
    const dateRange = getDateRange(selectedMonthDate);

    const ip = await getIP();

    if (ip) {
        location = await getLocation(ip);
    }

    const busyTimes = await getBusyTimes(
        dateRange[0].utc().format(),
        dateRange[1].utc().format()
    );

    const userTimezone = moment.tz.guess();
    calTimezone = await getCalTimezone();
    const startingDate = moment.tz(moment(dateRange[0]).utc(), calTimezone);
    const endingDate = moment.tz(moment(dateRange[1]).utc(), calTimezone);
    const localStartingDate = moment.tz(startingDate, userTimezone);
    const localStartingTime = moment
        .tz(
            moment.tz(
                `${startingDate.format("YYYY-MM-DD")} ${
                    query.bookingStartTime
                }`,
                calTimezone
            ),
            userTimezone
        )
        .format("HH:mm");
    const localEndingDate = moment.tz(endingDate, userTimezone);

    const availableTimes = getAvailableTimes(
        busyTimes,
        startingDate.clone(),
        endingDate.clone(),
        calTimezone
    );

    const localAvailableTimes = convertTimesToUserTz(
        availableTimes,
        userTimezone
    );

    eventAvailableTimes = filterAvailableTimesForEvent(
        localAvailableTimes,
        userTimezone,
        localStartingTime,
        query.eventDurationMin,
        query.bufferTime
    );

    // console.log('availableTimes', availableTimes);
    // console.log('localAvailableTimes', localAvailableTimes);
    // console.log('eventAvailableTimes', eventAvailableTimes);

    const disabledDates = getDisabledDates(
        eventAvailableTimes,
        localStartingDate,
        localEndingDate,
        userTimezone
    );

    $("#datepicker").datepicker("setDatesDisabled", disabledDates);

    $(".pre-con").fadeOut("fast");
});

$("article#page_1").on("swipeleft", () => {
    $(".datepicker-days th.next:first").trigger("click");
});

$("article#page_1").on("swiperight", () => {
    $(".datepicker-days th.prev:first").trigger("click");
});

$("article#page_2").on("swiperight", () => {
    $(".back_to_datepicker p").trigger("click");
});

$("#datepicker").on("changeMonth", async (e) => {
    $(".pre-con").fadeIn("fast");

    const selectedMonthDate = moment(e.date);
    const dateRange = getDateRange(selectedMonthDate);

    const busyTimes = await getBusyTimes(
        dateRange[0].utc().format(),
        dateRange[1].utc().format()
    );

    const userTimezone = moment.tz.guess();
    calTimezone = await getCalTimezone();
    const startingDate = moment.tz(moment(dateRange[0]).utc(), calTimezone);
    const endingDate = moment.tz(moment(dateRange[1]).utc(), calTimezone);
    const localStartingDate = moment.tz(startingDate, userTimezone);
    const localStartingTime = moment
        .tz(
            moment.tz(
                `${startingDate.format("YYYY-MM-DD")} ${
                    query.bookingStartTime
                }`,
                calTimezone
            ),
            userTimezone
        )
        .format("HH:mm");
    const localEndingDate = moment.tz(endingDate, userTimezone);

    const availableTimes = getAvailableTimes(
        busyTimes,
        startingDate.clone(),
        endingDate.clone(),
        calTimezone
    );

    const localAvailableTimes = convertTimesToUserTz(
        availableTimes,
        userTimezone
    );

    eventAvailableTimes = filterAvailableTimesForEvent(
        localAvailableTimes,
        userTimezone,
        localStartingTime,
        query.eventDurationMin,
        query.bufferTime
    );

    // console.log('availableTimes', availableTimes);
    // console.log('localAvailableTimes', localAvailableTimes);
    // console.log('eventAvailableTimes', eventAvailableTimes);

    const disabledDates = getDisabledDates(
        eventAvailableTimes,
        localStartingDate,
        localEndingDate,
        userTimezone
    );

    $("#datepicker").datepicker("setDatesDisabled", disabledDates);
    $(".pre-con").fadeOut("fast");
});

$("#datepicker").on("changeDate", () => {
    // hide initial warning div
    $("#W1")[0].style.display = "none";

    // specify format for selected date value
    $("#selected_date").val($("#datepicker").datepicker("getFormattedDate"));

    const currentAvailableTimes = eventAvailableTimes.filter((timeRange) =>
        moment(timeRange.start).isSame(selected_date.value, "day")
    );

    const userTimezone = moment.tz.guess();
    const lastObject = currentAvailableTimes.length;
    const dayStartTime = moment.tz(
        moment.tz(
            `${selected_date.value} ${query.bookingStartTime}`,
            calTimezone
        ),
        userTimezone
    );

    const timeStart =
        moment().add(query.startingBuffer, "m") <=
        moment(currentAvailableTimes[0].start)
            ? moment(currentAvailableTimes[0].start)
            : roundMinutes(moment().add(query.startingBuffer, "m"));
    const timeEnd = moment(currentAvailableTimes[lastObject - 1].end)
        .subtract(
            parseInt(query.eventDurationMin, 10) +
                parseInt(query.bufferTime, 10),
            "minutes"
        )
        .add("1", "minutes");
    // console.log('timeStart', timeStart.format('HH:mm'));
    // console.log('timeEnd', timeEnd.format('HH:mm'));

    const disableTimes = () => {
        const disableTimesArray = [];
        currentAvailableTimes.forEach((range, index) => {
            const duration = parseInt(query.eventDurationMin, 10);
            const buffer = parseInt(query.bufferTime, 10);

            if (index === 0) {
                const arr1 = [];
                // if range start is not the start of day
                if (
                    moment(range.start).format("HH:mm") !==
                        dayStartTime.format("HH:mm") &&
                    moment(range.start).format("HH:mm") !== "00:00"
                ) {
                    const disableStart = moment(range.start).format("HH:mm");
                    const disableEnd = moment(range.start)
                        .clone()
                        .add(buffer, "minutes")
                        .format("HH:mm");

                    arr1.push(disableStart, disableEnd);
                    disableTimesArray.push(arr1);
                }
            }

            if (index < lastObject - 1) {
                const arr2 = [];
                const disableStart = moment(range.end)
                    .clone()
                    .subtract(duration + buffer, "minutes")
                    .add("1", "minute")
                    .format("HH:mm");
                const disableEnd =
                    moment(currentAvailableTimes[index + 1].start).format(
                        "HH:mm"
                    ) !== dayStartTime.format("HH:mm")
                        ? moment(currentAvailableTimes[index + 1].start)
                              .clone()
                              .add(buffer, "minutes")
                              .format("HH:mm")
                        : moment(currentAvailableTimes[index + 1].start).format(
                              "HH:mm"
                          );
                arr2.push(disableStart, disableEnd);
                disableTimesArray.push(arr2);
            }
        });
        return disableTimesArray;
    };

    // display user timezone above timepicker
    const tz = moment.tz.guess();
    if (query.showTimeZone === "show") {
        $(".user_timezone").html(
            `<i class="far fa-globe-americas fa-2x"></i> ${tz}`
        );
    }

    // if current time is after end time, display a message and disable input
    if (selected_date.value === moment().format("YYYY-MM-DD")) {
        const currTime = moment().tz(tz);
        const endTime = timeEnd;
        if (currTime > endTime) {
            $("#time_start").prop("disabled", true);
            $("#time_start").attr(
                "placeholder",
                "No more available slots for today"
            );
        }
    } else {
        $("#time_start").prop("disabled", false);
        $("#time_start").attr("placeholder", "");
    }

    // specify settings for the time start input
    $("#time_start").timepicker({
        timeFormat: getTimeFormat("yes"),
        minTime: timeStart.format("HH:mm"),
        maxTime: timeEnd.format("HH:mm"),
        disableTimeRanges: disableTimes(),
        disableTextInput: true,
        disableTouchKeyboard: true,
        step: getStepInt(),
    });

    $("#time_end").prop("disabled", true);
    // force clear time end input value when selecting start time
    $("#time_start").on("showTimepicker", () => {
        $("#time_end").timepicker("remove");
        $("#time_end").val("");
        $("#time_end").prop("disabled", true);
    });

    // enable time end input form after start time is picked
    $("#time_start").on("changeTime", () => {
        $("#W2")[0].style.display = "none";
        $("#time_start").val();
        $("#time_end").prop("disabled", false);

        // set default settings for time end input
        $("#time_end").timepicker({
            timeFormat: getTimeFormat("yes"),
            minTime: getIntervalTime(),
            maxTime: getTimeEndTime(eventAvailableTimes),
            durationTime: time_start.value,
            disableTextInput: true,
            disableTouchKeyboard: true,
            showDuration: true,
            step: Math.min(query.eventDurationMin, 30),
        });
    });

    $(".session-time-notice").remove();
    if (query.eventDurationMin === query.eventDurationMax) {
        const sessionNotice = query.sessionNotice
            ? query.sessionNotice
            : `Scheduling a ${query.eventDurationMin} minute appointment.`;
        $(".timeend").after(
            `<div class="session-time-notice"><p>${sessionNotice}</p></div>`
        );
    } else {
        $(".timeend").show();
    }

    $("#time_start").on("hideTimepicker", () => {
        if ($("#time_start").val()) {
            $("a.done").addClass("clickable");
        }
        $("#time_end").timepicker("show");
        if ($(".ui-timepicker-with-duration li").length === 1) {
            $("#time_end").val(
                $(".ui-timepicker-with-duration li:first")
                    .clone()
                    .children()
                    .remove()
                    .end()
                    .text()
            );
            $(
                ".ul-timepicker-with-duration ul.ui-timepicker-list li:first"
            ).addClass("ui-timepicker-selected");
        }
        $("#time_end").timepicker("hide");
    });

    // hide warning (if present) and display value after selecting a time
    $("#time_end").on("changeTime", () => {
        $("#W3")[0].style.display = "none";
        $("#time_end").val();
    });
});

// show or hide error message if date not selected
$("article:not(:last)").append('<a class="next" href="#">Next</a>');
$("article:nth-child(1n+2)").hide();
$("article:first").addClass("visible");
$("a.next").on("click", function c(e) {
    e.preventDefault();
    if (selected_date.value !== "") {
        $(this)
            .closest("article")
            .removeClass("visible")
            .hide()
            .next()
            .addClass("visible")
            .fadeIn();
        $(window).scrollTop(0);
    } else {
        $("#W1")[0].style.display = "block";
    }
});

// show first article on picking new date button
$(".back_to_datepicker p").on("click", function c(e) {
    e.preventDefault();
    $("#time_start").prop("disabled", false);
    $("a.done").removeClass("clickable");
    $("#datetime").get(0).reset();
    $("#time_start").removeData();
    $(this)
        .closest("article")
        .removeClass("visible")
        .hide()
        .prev()
        .addClass("visible")
        .fadeIn();
    $(window).scrollTop(0);
});

const onDone = () => {
    if (time_start.value === "") {
        $("#W2")[0].style.display = "block";
    } else if (time_end.value === "") {
        $("#W3")[0].style.display = "block";
    } else {
        const userTimezone = moment.tz.guess();
        const selectedDateFormatted = moment(
            `${selected_date.value} ${toUniversalTime(time_start.value)}`
        ).format("ddd, MMM Do");
        const selectedStart = moment(
            `${selected_date.value} ${toUniversalTime(time_start.value)}`
        );
        const selectedEnd = moment(
            `${selected_date.value} ${toUniversalTime(time_end.value)}`
        );
        const selectedDifference = selectedEnd.diff(selectedStart) / 60000;
        $.ajax({
            type: "POST",
            url: "/v1/calendarapi/addevent",
            data: {
                eventTitle: query.eventTitle,
                eventDescription: query.eventDescription,
                eventStatus: query.eventStatus,
                eventFromDate: selected_date.value,
                eventToDate: selected_date.value,
                eventStartTime: time_start.value,
                eventEndTime: time_end.value,
                calendarId: query.calendarId,
                userTimezone,
            },
        })
            .done((response) => {
                const { eventId } = response;

                fbq("track", "Schedule");

                $.ajax({
                    type: "POST",
                    url: "/v1/hook/cfbroadcast",
                    data: {
                        botId: query.botId,
                        userId: query.userId,
                        broadcastId: query.broadcastId,
                        gotoBlock: query.gotoBlock,
                        eventId,
                        eventDateFormatted: selectedDateFormatted,
                        eventStartTime: time_start.value,
                        eventEndTime: time_end.value,
                        eventDuration: selectedDifference,
                        userTimezone,
                        ipAddress: location.ip,
                        latitude: location.latitude,
                        longitude: location.longitude,
                        city: location.city,
                        regionCode: location.region_code,
                        zipCode: location.zip,
                        countryCode: location.country_code,
                    },
                }).done(() => {
                    MessengerExtensions.requestCloseBrowser(
                        () => {
                            // webview closed
                        },
                        (error1) => {
                            console.log(error1);
                            window.close();
                        }
                    );
                });
            })
            .fail(() => {
                MessengerExtensions.requestCloseBrowser(
                    () => {
                        // webview closed
                    },
                    (error2) => {
                        console.log(error2);
                        window.close();
                    }
                );
            });
    }
};

// make ajax call to broadcast back to chatfuel and close webview
$("a.done").on("click", (e) => {
    e.preventDefault();
    if ($("a.done").hasClass("clickable")) {
        $("a.done").removeClass("clickable");
        $("#time_start").prop("disabled", true);
        onDone();
    }
});
