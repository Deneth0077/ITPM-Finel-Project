const CalendarEvent = require('../models/CalendarEvent');

class CalendarEventController {
  // Get all events for a user
  static async getAllEvents(req, res) {
    try {
      const events = await CalendarEvent.find({ user: req.user._id });
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching events', error: error.message });
    }
  }

  // Get a single event
  static async getEventById(req, res) {
    try {
      const event = await CalendarEvent.findOne({ 
        _id: req.params.id,
        user: req.user._id 
      });
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      res.status(200).json(event);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching event', error: error.message });
    }
  }

  // Create a new event
  static async createEvent(req, res) {
    try {
      const { title, start, end, allDay, calendar } = req.body;
      
      const newEvent = new CalendarEvent({
        title,
        start,
        end,
        allDay,
        calendar,
        user: req.user._id
      });

      const savedEvent = await newEvent.save();
      res.status(201).json(savedEvent);
    } catch (error) {
      res.status(400).json({ message: 'Error creating event', error: error.message });
    }
  }

  // Update an event
  static async updateEvent(req, res) {
    try {
      const { title, start, end, allDay, calendar } = req.body;
      
      const event = await CalendarEvent.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { title, start, end, allDay, calendar },
        { new: true, runValidators: true }
      );

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.status(200).json(event);
    } catch (error) {
      res.status(400).json({ message: 'Error updating event', error: error.message });
    }
  }

  // Delete an event
  static async deleteEvent(req, res) {
    try {
      const event = await CalendarEvent.findOneAndDelete({ 
        _id: req.params.id,
        user: req.user._id 
      });

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting event', error: error.message });
    }
  }

  // Get events within a date range
  static async getEventsByDateRange(req, res) {
    try {
      const { start, end } = req.query;
      
      const events = await CalendarEvent.find({
        user: req.user._id,
        start: { $gte: new Date(start) },
        end: { $lte: new Date(end) }
      });

      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching events', error: error.message });
    }
  }
}

module.exports = CalendarEventController; 