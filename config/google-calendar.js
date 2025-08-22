const { google } = require("googleapis");
const path = require("path");

// Service Account Authentication with domain-wide delegation
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "../credentials/service-account-key.json"),
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

// If you need to impersonate a user (for GSuite domains)
const authWithImpersonation = new google.auth.JWT({
  keyFile: path.join(__dirname, "../credentials/service-account-key.json"),
  scopes: ["https://www.googleapis.com/auth/calendar"],
  subject: "mdshohansajjad@gmail.com", // The user to impersonate
});

// Initialize Google Calendar API
const calendar = google.calendar({ version: "v3", auth: authWithImpersonation });

class GoogleCalendarService {
  constructor() {
    this.calendarId = "mdshohansajjad@gmail.com";
    this.currentAppointmentId = null;
  }

  // Create or update the single appointment
  async setAppointment(eventData) {
    try {
      let response;
      const requestId = `appointment_${Date.now()}`;

      const conferenceData = {
        createRequest: {
          requestId: requestId,
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
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
      } else {
        // Create new appointment
        response = await calendar.events.insert({
          calendarId: this.calendarId,
          resource: {
            ...eventData,
            conferenceData: conferenceData,
          },
          conferenceDataVersion: 1,
          sendUpdates: "all", // Send notifications to attendees
        });
      }
      
      this.currentAppointmentId = response.data.id;
      console.log("Appointment saved successfully with Meet link:", response.data.hangoutLink);
      return response.data;
    } catch (error) {
      console.error("Error setting appointment:", error.message);
      if (error.response) {
        console.error("Error details:", error.response.data);
      }
      throw error;
    }
  }

  // Other methods remain the same...
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
      if (error.code === 404) {
        this.currentAppointmentId = null;
        return { message: "Appointment not found, was it deleted?" };
      }
      throw error;
    }
  }

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
      if (error.code === 404) {
        this.currentAppointmentId = null;
        return { message: "Appointment was already deleted" };
      }
      throw error;
    }
  }

  clearAppointment() {
    this.currentAppointmentId = null;
    return { message: "Appointment reference cleared" };
  }
}

module.exports = new GoogleCalendarService();