
// models/bookingModel.js
import { bookingsDb } from "./_db.js";

export const BookingModel = {
  async create(booking) {
    return bookingsDb.insert({
      ...booking,
      createdAt: new Date().toISOString(),
    });
  },

  async findById(id) {
    return bookingsDb.findOne({ _id: id });
  },

  async listByUser(userId) {
    return bookingsDb.find({ userId }).sort({ createdAt: -1 });
  },

  async listByCourse(courseId) {
    return bookingsDb.find({ courseId }).sort({ createdAt: -1 });
  },

  async listBySessionId(sessionId) {
  return bookingsDb.find({
    type: "SESSION",
    sessionIds: sessionId,
    status: { $ne: "CANCELLED" }
  }).sort({ createdAt: -1 });
},

  async findActiveCourseBooking(userId, courseId) {
    return bookingsDb.findOne({
      userId,
      courseId,
      type: "COURSE",
      status: { $ne: "CANCELLED" },
    });
  },

  async findActiveSessionBooking(userId, sessionId) {
    return bookingsDb.findOne({
      userId,
      type: "SESSION",
      sessionIds: sessionId,
      status: { $ne: "CANCELLED" },
    });
  },

  async listSessionBookingsByCourseAndUser(courseId, userId) {
    return bookingsDb.find({
      userId,
      courseId,
      type: "SESSION",
    }).sort({ createdAt: -1 });
  },

  async cancel(id) {
    await bookingsDb.update({ _id: id }, { $set: { status: "CANCELLED" } });
    return this.findById(id);
  },
};
``
