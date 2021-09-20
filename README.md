# Chatfuel Scheduling API

A Scheduling Webview and Api for Chatfuel that uses Google Calendar.

### Project Status

This project is in maintenance status and no longer being actively developed.

## Features

-   RealSlots
-   Facebook Pixel support
-   Full timezone support
-   Availability
-   Multiple Calendars
-   Specific scheduling booking hours
-   Slot filling
-   Appointment buffer time
-   Weekly, biweekly, monthly scheduling options
-   Styled Webview Date and Time Pickers
-   Local 24 hour or AM/PM display options
-   Booking cancellation support
-   'Add to user calendar' invite support
-   Event Status Updates
-   Advanced Error Handling
-   Automatic reminders through the bot (coming soon)

## Hooks

-   `/v1/bookit` - URL for main webview
-   `/v1/calendarapi` - Google Calendar API hooks
-   `/v1/calendarapi/gettimezone` - Gets calendar timezone
-   `/v1/calendarapi/getavail` - Gets calendar Free Busy times
-   `/v1/calendarapi/addevent` - Inserts a new event in the calendar
-   `/v1/calendarapi/updateevent` - Patches a current event
-   `/v1/calendarapi/deleteevent` - Cancels a current event
-   `/v1/hook` - Internal hooks
-   `/v1/hook/getwebview` - Triggers webview from /v1/bookit
-   `/v1/hook/cfbroadcast` - Broadcasts back to Chatfuel Bot

## Getting Started

To use this project, you'll need to setup a few things.

1. You need to setup a Google service account with access to the Google Calendar API.
2. You need a Chatfuel Account with a bot setup.

## Configuration

-   userId: messenger user id from chatfuel **{{messenger user id}}**
-   botId: this is your bot id **available under the configure tab**
-   broadcastId: this is your broadcast id **available under the configure tab**
-   gotoBlock: the block to goto once the webview is closed
-   calendarId: the id of the Google Calendar
-   fbPixelId: the id of your Facebook Pixel
-   bookingStartTime: the time you want to start accepting events **enter 24hour time**
-   bookingEndTime: the time you want your last event to end **enter 24hour time**
-   bufferTime: the amount of time **in minutes** to space between events
-   enableDoubleBooking: allow doublebooking or use free busy **yes or no**
-   bookingType: specifies a loop to show dates on the calendar **weekly, biweekly/fortnightly, or monthly**
-   bookingDays:

    -   **If weekly** - days of the week to enable, comma seperated (enabled with the weekly frequency) **sun, mon, tue, wed, thu, fri, sat**
    -   **If biweekly/fortnightly** - dates to start the biweekly/fortnightly schedule, comma seperated, enter full dates (enabled with biweekly/fortnightly frequency) **5/1/18, 5/3/18, 5/12/18**
    -   **If monthly** - relational days or numeric dates of the month to be enabled, repeats monthly, comma seperated **numeric dates - 5, 6, 7, 8** or **relational days - first monday, second tuesday, third friday** _only use either numeric dates or relational days. Do not use both of them together_

-   eventDurationMin: the minimum amount of time to allow the event, in minutes **30**
-   eventDurationMax: the maximum amount of time to allow the event, in minutes **60**
-   enableAMPM: use am/pm local time instead of 24 hours **yes or no**
-   enableRealSlots: enable to create dedicated time slots instead of dynamic slots. **yes or no** _only enable when slotsMin and slotsMax are the same value - no variable slot times_

**Other Variables**

-   eventTitle - summary field for event
-   eventDescription - description for event
-   eventStatus - special indicator that gets appended to the summary
-   emailAddress - email address that gets added as an attendee
-   eventFromDate - the starting date of the event
-   eventToDate - the ending date of the event
-   eventDateFormatted - a formatted version of the date (Mon, Jun 23rd)
-   eventStartTime - the starting time of the event
-   eventEndTime - the ending time of the event
-   eventDuration - the event duration (in minutes)
-   userTimeZone - IANA timezone of the user

**UI Customization Variables**

-   calOpenHeading - text shown in bot to open webview
-   calOpenButton - text shown in bot on button to open webview
-   windowHeight - height of the webview. defaults to full
-   windowTitle - html title for page displayed on top of webview
-   calendarHeading - heading before datepicker
-   backButton - text on back to datepicker button
-   timeStartLabel - text above time start input
-   timeEndLabel - text above time end input
-   showTimeZone - show or hide
-   sessionNotice - text shown if duration min and max are same (and time end input is hidden)
