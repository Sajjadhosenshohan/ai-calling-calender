const { google } = require("googleapis");
const path = require("path");

// Service Account Authentication
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../credentials/service-account-key.json"),
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

// Initialize Google Calendar API
const calendar = google.calendar({ version: "v3", auth });

class GoogleCalendarService {
  constructor() {
    this.calendarId = "mdshohansajjad@gmail.com";
    this.currentAppointmentId = null; // Track the single appointment
  }

  // Create or update the single appointment
  async setAppointment(eventData) {
    try {
      let response;
      // const requestId = `appointment_${Date.now()}`;

      const conferenceData = {
        createRequest: {
          requestId: "unique-request-id-" + Date.now(),
          // No type specified - Google will choose the default
        },
      };

      if (this.currentAppointmentId) {
        // Update existing appointment
        response = await calendar.events.update({
          calendarId: this.calendarId,
          eventId: this.currentAppointmentId,
          resource: {
            ...eventData,
            conferenceData: conferenceData,
          },
          conferenceDataVersion: 1,
        });
        this.currentAppointmentId = response.data.id;
      } else {
        // Create new appointment
        response = await calendar.events.insert({
          calendarId: this.calendarId,
          resource: {
            ...eventData,
            conferenceData: conferenceData,
          },
          conferenceDataVersion: 1,
        });
        this.currentAppointmentId = response.data.id;
      }

      // console.log("Appointment saved successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error setting appointment:", error.message);
      if (error.response) {
        console.error("Error details:", error.response.data);
      }
      throw error;
    }
  }

  // Get the current appointment
  async getAppointment() {
    try {
      if (!this.currentAppointmentId) {
        return { message: "No appointment currently set" };
      }

      const response = await calendar.events.get({
        calendarId: this.calendarId,
        eventId: this.currentAppointmentId,
      });

      return response.data;
    } catch (error) {
      console.error("Error getting appointment:", error.message);

      // If appointment doesn't exist anymore, reset the ID
      if (error.code === 404) {
        this.currentAppointmentId = null;
        return { message: "Appointment not found, was it deleted?" };
      }

      throw error;
    }
  }

  // Cancel the current appointment
  async cancelAppointment() {
    try {
      if (!this.currentAppointmentId) {
        return { message: "No appointment to cancel" };
      }

      await calendar.events.delete({
        calendarId: this.calendarId,
        eventId: this.currentAppointmentId,
      });

      this.currentAppointmentId = null;
      return { message: "Appointment successfully cancelled" };
    } catch (error) {
      console.error("Error cancelling appointment:", error.message);

      // If appointment doesn't exist, reset the ID
      if (error.code === 404) {
        this.currentAppointmentId = null;
        return { message: "Appointment was already deleted" };
      }

      throw error;
    }
  }

  // Clear the current appointment ID without deleting from calendar
  clearAppointment() {
    this.currentAppointmentId = null;
    return { message: "Appointment reference cleared" };
  }
}

module.exports = new GoogleCalendarService();
