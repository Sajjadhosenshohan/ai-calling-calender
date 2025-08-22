const { google } = require("googleapis");
const { OAuth2 } = google.auth;

class GoogleCalendarService {
  constructor() {
    this.calendarId = "mdshohansajjad@gmail.com";
    this.currentAppointmentId = null;
    this.oauth2Client = null;
    
    this.initializeOAuthClient();
  }

  initializeOAuthClient() {
    this.oauth2Client = new OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI // Still needed for token refresh
    );

    // Set initial credentials from environment variables
    this.setCredentialsFromEnv();
  }

  setCredentialsFromEnv() {
    if (process.env.ACCESS_TOKEN && process.env.REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN
      });
      console.log("Credentials loaded from environment variables");
    } else if (process.env.REFRESH_TOKEN) {
      // If only refresh token is available, refresh it
      this.oauth2Client.setCredentials({
        refresh_token: process.env.REFRESH_TOKEN
      });
      this.refreshAccessToken();
    } else {
      console.warn("No OAuth credentials found in environment variables");
    }
  }

  async refreshAccessToken() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      console.log("Access token refreshed successfully");
      
      // Optionally save the new access token (though not strictly necessary)
      if (credentials.access_token) {
        process.env.ACCESS_TOKEN = credentials.access_token;
      }
      
      return credentials;
    } catch (error) {
      console.error("Error refreshing access token:", error.message);
      throw error;
    }
  }

  async ensureValidToken() {
    if (!this.oauth2Client.credentials.access_token) {
      await this.refreshAccessToken();
    }
  }

  async makeCalendarRequest(requestFn) {
    try {
      await this.ensureValidToken();
      return await requestFn();
    } catch (error) {
      if (error.code === 401) {
        // Token expired, try to refresh and retry
        console.log("Token expired, refreshing...");
        await this.refreshAccessToken();
        return await requestFn();
      }
      throw error;
    }
  }

  // Create or update the single appointment
  async setAppointment(eventData) {
    return this.makeCalendarRequest(async () => {
      const requestId = `appointment_${Date.now()}`;

      const conferenceData = {
        createRequest: {
          requestId: requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" }
        },
      };

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

      let response;
      if (this.currentAppointmentId) {
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
        response = await calendar.events.insert({
          calendarId: this.calendarId,
          resource: {
            ...eventData,
            conferenceData: conferenceData,
          },
          conferenceDataVersion: 1,
        });
      }
      
      this.currentAppointmentId = response.data.id;
      console.log("Appointment saved successfully:", response.data.id);
      return response.data;
    });
  }

  // Get the current appointment
  async getAppointment() {
    return this.makeCalendarRequest(async () => {
      if (!this.currentAppointmentId) {
        return { message: "No appointment currently set" };
      }

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
      const response = await calendar.events.get({
        calendarId: this.calendarId,
        eventId: this.currentAppointmentId,
      });

      return response.data;
    });
  }

  // Cancel the current appointment
  async cancelAppointment() {
    return this.makeCalendarRequest(async () => {
      if (!this.currentAppointmentId) {
        return { message: "No appointment to cancel" };
      }

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
      await calendar.events.delete({
        calendarId: this.calendarId,
        eventId: this.currentAppointmentId,
      });

      this.currentAppointmentId = null;
      return { message: "Appointment successfully cancelled" };
    });
  }

  // Clear the current appointment ID without deleting from calendar
  clearAppointment() {
    this.currentAppointmentId = null;
    return { message: "Appointment reference cleared" };
  }

  // One-time setup: Get initial refresh token (run this once)
  async getInitialRefreshToken() {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent'
    });
    
    console.log('Authorize this app by visiting this URL:', authUrl);
    console.log('After authorization, you will get a code to exchange for tokens');
  }

  // One-time setup: Exchange code for tokens (run this once)
  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      console.log('Refresh token:', tokens.refresh_token);
      console.log('Access token:', tokens.access_token);
      console.log('Save these to your environment variables');
      
      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }
}

module.exports = new GoogleCalendarService();