const express = require('express');
const router = express.Router();
const CalendarEventController = require('../controllers/CalendarEventController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Get all events
router.get('/', CalendarEventController.getAllEvents);

// Get events within a date range
router.get('/range', CalendarEventController.getEventsByDateRange);

// Get a single event
router.get('/:id', CalendarEventController.getEventById);

// Create a new event
router.post('/', CalendarEventController.createEvent);

// Update an event
router.put('/:id', CalendarEventController.updateEvent);

// Delete an event
router.delete('/:id', CalendarEventController.deleteEvent);

module.exports = router; 