const express = require('express');
const router = express.Router();
const calendarService = require('../config/google-calendar');

// POST /api/appointment - Create or update the single appointment (called from AI system)
router.post('/', async (req, res) => {
  try {
    const { summary, description, start, end, attendees } = req.body;
    
    // Validate required fields
    if (!summary || !start || !end) {
      return res.status(400).json({ 
        error: 'Missing required fields: summary, start, end' 
      });
    }
    
    // Validate date format
    if (isNaN(new Date(start.dateTime).getTime()) || isNaN(new Date(end.dateTime).getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use ISO 8601 format (e.g., 2023-10-25T10:00:00-07:00)' 
      });
    }
    
    const eventData = {
      summary,
      description: description || '',
      start: {
        dateTime: start.dateTime,
        timeZone: start.timeZone || 'America/Los_Angeles'
      },
      end: {
        dateTime: end.dateTime,
        timeZone: end.timeZone || 'America/Los_Angeles'
      },
      attendees: attendees || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };
    
    const appointment = await calendarService.setAppointment(eventData);
    res.status(201).json({
      message: 'Appointment successfully set',
      appointment: appointment
    });
  } catch (error) {
    console.error('Appointment creation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/appointment - Get the current appointment (for verification)
router.get('/', async (req, res) => {
  try {
    const appointment = await calendarService.getAppointment();
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/appointment - Cancel the current appointment
router.delete('/', async (req, res) => {
  try {
    const result = await calendarService.cancelAppointment();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/appointment/clear - Clear the appointment reference without deleting
router.post('/clear', async (req, res) => {
  try {
    const result = calendarService.clearAppointment();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// One-time setup endpoint (run once to get refresh token)
router.get('/setup', async (req, res) => {
  try {
    await calendarService.getInitialRefreshToken();
    res.json({ message: 'Check server logs for authorization URL' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this to your appointments router
router.get('/oauth-callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }
    
    const tokens = await calendarService.exchangeCodeForTokens(code);
    res.json({ 
      message: 'Authentication successful!',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// One-time setup: Exchange authorization code for tokens
router.post('/setup/tokens', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }
    
    const tokens = await calendarService.exchangeCodeForTokens(code);
    res.json({ 
      message: 'Tokens obtained successfully',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;