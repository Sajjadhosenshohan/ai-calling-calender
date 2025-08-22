const express = require('express');
const router = express.Router();
const calendarService = require('../config/google-calendar');

// GET /api/appointment - Get the current appointment
router.get('/', async (req, res) => {
  try {
    const appointment = await calendarService.getAppointment();
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/appointment - Create or update the single appointment
router.post('/', async (req, res) => {
  try {
    const { summary, description, start, end, } = req.body;
    
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
        timeZone: start.timeZone || 'Asia/Dhaka'
      },
      end: {
        dateTime: end.dateTime,
        timeZone: end.timeZone || 'Asia/Dhaka'
      },
      attendees:  [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 } // 30 minutes before
        ]
      }
    };
    
    const appointment = await calendarService.setAppointment(eventData);
    res.status(201).json({
      message: 'Appointment successfully set',
      appointment: appointment
    });
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

module.exports = router;