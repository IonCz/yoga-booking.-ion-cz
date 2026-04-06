import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";

// Student enrols in the course only.
// This does NOT auto-book every session.
export async function bookCourseForUser(userId, courseId) {
  const course = await CourseModel.findById(courseId);
  if (!course) throw new Error("Course not found");

  const sessions = await SessionModel.listByCourse(courseId);
  if (sessions.length === 0) throw new Error("Course has no sessions");

  const existing = await BookingModel.findActiveCourseBooking(userId, courseId);
  if (existing) {
    const err = new Error("You are already enrolled in this course");
    err.code = "ALREADY_ENROLLED";
    throw err;
  }

  return BookingModel.create({
    userId,
    courseId,
    type: "COURSE",
    sessionIds: [],
    status: "CONFIRMED",
  });
}

// Student can book one session only if already enrolled in the course.
export async function bookSessionForUser(userId, sessionId) {
  const session = await SessionModel.findById(sessionId);
  if (!session) throw new Error("Session not found");

  const course = await CourseModel.findById(session.courseId);
  if (!course) throw new Error("Course not found");

  const enrolment = await BookingModel.findActiveCourseBooking(userId, course._id);
  if (!enrolment) {
    const err = new Error("You must enrol in this course before booking a session");
    err.code = "ENROLMENT_REQUIRED";
    throw err;
  }

  const existingSessionBooking = await BookingModel.findActiveSessionBooking(
    userId,
    session._id
  );

  if (existingSessionBooking) {
    const err = new Error("You have already booked this session");
    err.code = "ALREADY_BOOKED";
    throw err;
  }

  let status = "CONFIRMED";

  if ((session.bookedCount ?? 0) >= (session.capacity ?? 0)) {
    status = "WAITLISTED";
  } else {
    await SessionModel.incrementBookedCount(session._id, 1);
  }

  return BookingModel.create({
    userId,
    courseId: course._id,
    type: "SESSION",
    sessionIds: [session._id],
    status,
  });
}