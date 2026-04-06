//controllers/viewsController.js

import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDateOnly = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const homePage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();

    const cards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const nextSession = sessions[0];

        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          startDate: c.startDate ? fmtDateOnly(c.startDate) : "",
          endDate: c.endDate ? fmtDateOnly(c.endDate) : "",
          nextSession: nextSession ? fmtDate(nextSession.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          price: c.price,
          description: c.description,
        };
      })
    );

    res.render("home", {
      title: "Yoga Courses",
      courses: cards,
    });
  } catch (err) {
    next(err);
  }
};

export const courseDetailPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);

    if (!course) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });
    }

    const sessions = await SessionModel.listByCourse(courseId);

    let isEnrolled = false;
    let bookedSessionIds = new Set();

    if (req.user && req.user.role === "student") {
      const enrolment = await BookingModel.findActiveCourseBooking(
        req.user._id,
        courseId
      );
      isEnrolled = !!enrolment;

      const sessionBookings =
        await BookingModel.listSessionBookingsByCourseAndUser(courseId, req.user._id);

      bookedSessionIds = new Set(
        sessionBookings
          .filter((b) => b.status !== "CANCELLED")
          .flatMap((b) => b.sessionIds || [])
      );
    }

    const rows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      end: fmtDate(s.endDateTime),
      capacity: s.capacity,
      booked: s.bookedCount ?? 0,
      location: s.location || "",
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
      canBook: isEnrolled && !bookedSessionIds.has(s._id),
      alreadyBooked: bookedSessionIds.has(s._id),
    }));

    res.render("course", {
      title: course.title,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        price: course.price,
        description: course.description,
      },
      sessions: rows,
      isStudent: req.user && req.user.role === "student",
      isInstructor: req.user && req.user.role === "instructor",
      isEnrolled,
    });
  } catch (err) {
    next(err);
  }
};

export const postBookCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const booking = await bookCourseForUser(req.user._id, courseId);

    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    res.status(400).render("error", {
      title: "Booking failed",
      message: err.message,
    });
  }
};

export const postBookSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const booking = await bookSessionForUser(req.user._id, sessionId);

    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    const message =
      err.code === "ENROLMENT_REQUIRED"
        ? "You must enrol in this course before booking a session."
        : err.message;

    res.status(400).render("error", {
      title: "Booking failed",
      message,
    });
  }
};

export const bookingConfirmationPage = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Booking not found" });
    }

    res.render("booking_confirmation", {
      title: "Booking confirmation",
      booking: {
        id: booking._id,
        type: booking.type,
        status: req.query.status || booking.status,
        createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
      },
    });
  } catch (err) {
    next(err);
  }
};
