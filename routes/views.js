// routes/views.js
import { register, login, logout } from "../auth/auth.js";
import { Router } from "express";
import {
  homePage,
  courseDetailPage,
  postBookCourse,
  postBookSession,
  bookingConfirmationPage,
} from "../controllers/viewsController.js";
import { coursesListPage } from "../controllers/coursesListController.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";
import bcrypt from "bcrypt";

const router = Router();

function requireInstructor(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  if (req.user.role !== "instructor") {
    return res.status(403).render("error", {
      title: "Forbidden",
      message: "You must be signed in as an instructor to access this page.",
    });
  }
  next();
}

function requireStudent(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }

  if (req.user.role !== "student") {
    return res.status(403).render("error", {
      title: "Forbidden",
      message: "You must be signed in as a student to access this page.",
    });
  }
  next();
}

// Auth pages
router.get("/register", (req, res) => {
  res.render("register", {
    title: "Register",
  });
});

router.post("/register", register);

router.get("/login", (req, res) => {
  res.render("login", {
    title: "Login",
  });
});

router.post("/login", login);

router.get("/logout", logout);

router.get("/account", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    res.render("account_edit", {
      title: "My Account",
      updated: req.query.updated === "1",
      userData: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/account", async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).render("account_edit", {
        title: "My Account",
        error: "Name and email are required.",
        userData: {
          id: req.user._id,
          name,
          email,
          role: req.user.role,
        },
      });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing && existing._id !== req.user._id) {
      return res.status(400).render("account_edit", {
        title: "My Account",
        error: "This email is already used by another account.",
        userData: {
          id: req.user._id,
          name,
          email,
          role: req.user.role,
        },
      });
    }

    const patch = {
      name,
      email,
    };

    if (password && password.trim() !== "") {
      const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
      patch.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    await UserModel.update(req.user._id, patch);

    res.redirect("/account?updated=1");
  } catch (err) {
    next(err);
  }
});

// Public pages
router.get("/", homePage);
router.get("/courses", coursesListPage);
router.get("/courses/:id", courseDetailPage);

// Student booking routes
router.post("/courses/:id/book", requireStudent, postBookCourse);
router.post("/sessions/:id/book", requireStudent, postBookSession);
router.get("/bookings/:bookingId", bookingConfirmationPage);

// Student portal - enrolled courses
router.get("/my/courses", requireStudent, async (req, res, next) => {
  try {
    const allBookings = await BookingModel.listByUser(req.user._id);

    const enrolments = allBookings.filter(
      (b) => b.type === "COURSE" && b.status !== "CANCELLED"
    );

    const cards = [];

    for (const enrolment of enrolments) {
      const course = await CourseModel.findById(enrolment.courseId);
      if (!course) continue;

      cards.push({
        bookingId: enrolment._id,
        courseId: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        startDate: course.startDate || "",
        endDate: course.endDate || "",
        description: course.description || "",
        cancelMessage: `Are you sure you want to cancel your enrolment for "${course.title}"? This will also cancel all session bookings you made for this course.`,
      });
    }

    res.render("my_courses", {
      title: "My Courses",
      courses: cards,
      successMessage:
        req.query.cancelled === "1" ? "Course enrolment cancelled successfully." : "",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/my/bookings", requireStudent, (req, res) => {
  res.redirect("/my/courses");
});

// Student portal - session bookings for one course
router.get("/my/courses/:id/bookings", requireStudent, async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);

    if (!course) {
      return res.status(404).render("error", {
        title: "Course not found",
        message: "The course you are trying to view does not exist.",
      });
    }

    const enrolment = await BookingModel.findActiveCourseBooking(req.user._id, course._id);
    if (!enrolment) {
      return res.status(403).render("error", {
        title: "Forbidden",
        message: "You are not enrolled in this course.",
      });
    }

    const sessionBookings =
      await BookingModel.listSessionBookingsByCourseAndUser(course._id, req.user._id);

     const activeBookings = sessionBookings.filter(
      (booking) => booking.status !== "CANCELLED"
      );

const rows = [];

     for (const booking of activeBookings) {
      let sessionInfo = null;

      if (booking.sessionIds?.length) {
        const session = await SessionModel.findById(booking.sessionIds[0]);
        if (session) {
          sessionInfo = {
            start: session.startDateTime
              ? new Date(session.startDateTime).toLocaleString("en-GB")
              : "",
            end: session.endDateTime
              ? new Date(session.endDateTime).toLocaleString("en-GB")
              : "",
          };
        }
      }

      rows.push({
        id: booking._id,
        status: booking.status,
        createdAt: booking.createdAt
          ? new Date(booking.createdAt).toLocaleString("en-GB")
          : "",
        sessionStart: sessionInfo?.start || "",
        sessionEnd: sessionInfo?.end || "",
        canCancel: booking.status !== "CANCELLED",
        cancelMessage: `Are you sure you want to cancel this session booking for "${course.title}"?`,
      });
    }

    res.render("my_course_bookings", {
      title: "My Session Bookings",
      course: {
        id: course._id,
        title: course.title,
      },
      bookings: rows,
      successMessage:
        req.query.cancelled === "1" ? "Session booking cancelled successfully." : "",
    });
  } catch (err) {
    next(err);
  }
});

// Student portal - cancel COURSE enrolment
router.post("/my/courses/:id/cancel", requireStudent, async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);

    if (!course) {
      return res.status(404).render("error", {
        title: "Course not found",
        message: "The course you are trying to cancel does not exist.",
      });
    }

    const enrolment = await BookingModel.findActiveCourseBooking(req.user._id, course._id);

    if (!enrolment) {
      return res.status(404).render("error", {
        title: "Enrolment not found",
        message: "You are not enrolled in this course.",
      });
    }

    const sessionBookings =
      await BookingModel.listSessionBookingsByCourseAndUser(course._id, req.user._id);

    for (const booking of sessionBookings) {
      if (booking.status === "CONFIRMED") {
        for (const sessionId of booking.sessionIds || []) {
          const session = await SessionModel.findById(sessionId);
          if (session) {
            await SessionModel.incrementBookedCount(sessionId, -1);
          }
        }
      }

      if (booking.status !== "CANCELLED") {
        await BookingModel.cancel(booking._id);
      }
    }

    await BookingModel.cancel(enrolment._id);

    res.redirect("/my/courses?cancelled=1");
  } catch (err) {
    next(err);
  }
});

// Student portal - cancel one SESSION booking
router.post("/my/bookings/:id/cancel", requireStudent, async (req, res, next) => {
  try {
    const booking = await BookingModel.findById(req.params.id);

    if (!booking) {
      return res.status(404).render("error", {
        title: "Booking not found",
        message: "The booking you are trying to cancel does not exist.",
      });
    }

    if (booking.userId !== req.user._id) {
      return res.status(403).render("error", {
        title: "Forbidden",
        message: "You are not allowed to cancel this booking.",
      });
    }

    if (booking.status === "CANCELLED") {
      return res.redirect(`/my/courses/${booking.courseId}/bookings?cancelled=1`);
    }

    if (booking.status === "CONFIRMED") {
      for (const sessionId of booking.sessionIds || []) {
        const session = await SessionModel.findById(sessionId);
        if (session) {
          await SessionModel.incrementBookedCount(sessionId, -1);
        }
      }
    }

    await BookingModel.cancel(booking._id);

    res.redirect(`/my/courses/${booking.courseId}/bookings?cancelled=1`);
  } catch (err) {
    next(err);
  }
});

// Instructor dashboard
router.get("/admin", requireInstructor, (req, res) => {
  res.render("admin_dashboard", {
    title: "Instructor Dashboard",
  });
});

// Add course - page
router.get("/admin/courses/new", requireInstructor, (req, res) => {
  res.render("admin_course_new", {
    title: "Add Course",
  });
});

// Add course - submit
router.post("/admin/courses/new", requireInstructor, async (req, res, next) => {
  try {
    const {
      title,
      level,
      type,
      allowDropIn,
      startDate,
      endDate,
      price,
      description,
    } = req.body;

    if (!title || !level || !type || !startDate || !endDate || !price || !description) {
      return res.status(400).render("error", {
        title: "Invalid course",
        message: "Please complete all required fields.",
      });
    }

    await CourseModel.create({
      title,
      level,
      type,
      allowDropIn: allowDropIn === "true",
      startDate,
      endDate,
      price: Number(price),
      instructorId: req.user._id,
      sessionIds: [],
      description,
    });

    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
});

// Add session - page
router.get("/admin/sessions/new", requireInstructor, async (req, res, next) => {
  try {
    const courses = await CourseModel.list();

    res.render("admin_session_new", {
      title: "Add Session",
      courses: courses.map((c) => ({
        id: c._id,
        title: c.title,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Add session - submit
router.post("/admin/sessions/new", requireInstructor, async (req, res, next) => {
  try {
    const { courseId, startDateTime, endDateTime, capacity, location } = req.body;

    if (!courseId || !startDateTime || !endDateTime || !capacity|| !location) {
      return res.status(400).render("error", {
        title: "Invalid session",
        message: "Please complete all required session fields.",
      });
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).render("error", {
        title: "Course not found",
        message: "The selected course does not exist.",
      });
    }

    const session = await SessionModel.create({
      courseId,
      startDateTime,
      endDateTime,
      capacity: Number(capacity),
      bookedCount: 0,
      location,
    });

    const updatedSessionIds = [...(course.sessionIds || []), session._id];
    await CourseModel.update(courseId, {
      sessionIds: updatedSessionIds,
    });

    res.redirect(`/courses/${courseId}`);
  } catch (err) {
    next(err);
  }
});

// Manage courses
router.get("/admin/courses", requireInstructor, async (req, res, next) => {
  try {
    const courses = await CourseModel.list();

    res.render("admin_courses", {
      title: "Manage Courses",
      successMessage: req.query.deleted === "1" ? "Course deleted successfully." : "",
      courses: courses.map((c) => ({
        id: c._id,
        title: c.title,
        level: c.level,
        type: c.type,
        startDate: c.startDate,
        endDate: c.endDate,
        firstSessionId: c.sessionIds?.[0] || null,

      })),
    });
  } catch (err) {
    next(err);
  }
});

// Edit course - page
router.get("/admin/courses/:id/edit", requireInstructor, async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);

    if (!course) {
      return res.status(404).render("error", {
        title: "Course not found",
        message: "The course you are trying to edit does not exist.",
      });
    }

    res.render("admin_course_edit", {
      title: "Edit Course",
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate,
        endDate: course.endDate,
        price: course.price,
        description: course.description,
        isBeginner: course.level === "beginner",
        isIntermediate: course.level === "intermediate",
        isAdvanced: course.level === "advanced",
        isWeekend: course.type === "WEEKEND_WORKSHOP",
        isWeekly: course.type === "WEEKLY_BLOCK",
      },
    });
  } catch (err) {
    next(err);
  }
});

// Edit course - submit
router.post("/admin/courses/:id/edit", requireInstructor, async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);

    if (!course) {
      return res.status(404).render("error", {
        title: "Course not found",
        message: "The course you are trying to update does not exist.",
      });
    }

    const {
      title,
      level,
      type,
      allowDropIn,
      startDate,
      endDate,
      price,
      description,
    } = req.body;

    if (!title || !level || !type || !startDate || !endDate || !price || !description) {
      return res.status(400).render("error", {
        title: "Invalid course",
        message: "Please complete all required fields.",
      });
    }

    await CourseModel.update(course._id, {
      title,
      level,
      type,
      allowDropIn: allowDropIn === "true",
      startDate,
      endDate,
      price: Number(price),
      description,
    });

    res.redirect("/admin/courses");
  } catch (err) {
    next(err);
  }
});

// Delete course
router.post("/admin/courses/:id/delete", requireInstructor, async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);

    if (!course) {
      return res.status(404).render("error", {
        title: "Course not found",
        message: "The course you are trying to delete does not exist.",
      });
    }

    const relatedBookings = await BookingModel.listByCourse(course._id);
    for (const booking of relatedBookings) {
      if (booking.status !== "CANCELLED") {
        await BookingModel.cancel(booking._id);
      }
    }

    const sessions = await SessionModel.listByCourse(course._id);
    for (const s of sessions) {
      await SessionModel.removeById(s._id);
    }

    await CourseModel.removeById(course._id);

    res.redirect("/admin/courses?deleted=1");
  } catch (err) {
    next(err);
  }
});

// Edit session - page
router.get("/admin/sessions/:id/edit", requireInstructor, async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);

    if (!session) {
      return res.status(404).render("error", {
        title: "Session not found",
        message: "The session you are trying to edit does not exist.",
      });
    }

    res.render("admin_session_edit", {
      title: "Edit Session",
      session: {
        id: session._id,
        courseId: session.courseId,
        startDateTime: session.startDateTime ? session.startDateTime.slice(0, 16) : "",
        endDateTime: session.endDateTime ? session.endDateTime.slice(0, 16) : "",
        capacity: session.capacity,
        bookedCount: session.bookedCount ?? 0,
        location: session.location || "",      },
    });
  } catch (err) {
    next(err);
  }
});

// Edit session - submit
router.post("/admin/sessions/:id/edit", requireInstructor, async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);

    if (!session) {
      return res.status(404).render("error", {
        title: "Session not found",
        message: "The session you are trying to update does not exist.",
      });
    }

    const { startDateTime, endDateTime, capacity, location } = req.body;

    if (!startDateTime || !endDateTime || !capacity|| !location) {
      return res.status(400).render("error", {
        title: "Invalid session",
        message: "Please complete all required fields.",
      });
    }

    const numericCapacity = Number(capacity);

    if (Number.isNaN(numericCapacity) || numericCapacity <= 0) {
      return res.status(400).render("error", {
        title: "Invalid capacity",
        message: "Capacity must be a positive number.",
      });
    }

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      return res.status(400).render("error", {
        title: "Invalid dates",
        message: "End date/time must be after start date/time.",
      });
    }

    if (numericCapacity < (session.bookedCount ?? 0)) {
      return res.status(400).render("error", {
        title: "Invalid capacity",
        message: "Capacity cannot be lower than the number of students already booked.",
      });
    }

    await SessionModel.update(session._id, {
      startDateTime,
      endDateTime,
      capacity: numericCapacity,
      location,
    });

    res.redirect(`/courses/${session.courseId}`);
  } catch (err) {
    next(err);
  }
});

// Delete session
router.post("/admin/sessions/:id/delete", requireInstructor, async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);

    if (!session) {
      return res.status(404).render("error", {
        title: "Session not found",
        message: "The session you are trying to delete does not exist.",
      });
    }

    // 1. cancel all bookings linked to this session
    const relatedBookings = await BookingModel.listBySessionId(session._id);

    for (const booking of relatedBookings) {
      if (booking.status !== "CANCELLED") {
        await BookingModel.cancel(booking._id);
      }
    }

    // 2. remove session id from parent course
    const course = await CourseModel.findById(session.courseId);

    if (course) {
      const updatedSessionIds = (course.sessionIds || []).filter(
        (sid) => sid !== session._id
      );

      await CourseModel.update(course._id, {
        sessionIds: updatedSessionIds,
      });
    }

    // 3. delete the session itself
    await SessionModel.removeById(session._id);

    // 4. redirect back to course page
    res.redirect(`/courses/${session.courseId}`);
  } catch (err) {
    next(err);
  }
});


// Participants 
router.get("/admin/sessions/:id/participants", requireInstructor, async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);

    if (!session) {
      return res.status(404).render("error", {
        title: "Session not found",
        message: "This session does not exist.",
      });
    }

    const bookings = await BookingModel.listBySessionId(session._id);

    const seenUsers = new Set();
    const participants = [];

    for (const booking of bookings) {
      if (booking.status === "CANCELLED") continue;
      if (seenUsers.has(booking.userId)) continue;

      const user = await UserModel.findById(booking.userId);

      if (user) {
        participants.push({
          name: user.name,
          email: user.email,
          status: booking.status,
        });

        seenUsers.add(booking.userId);
      }
    }

    res.render("admin_session_participants", {
      title: "Session Participants",
      session: {
        id: session._id,
        courseId: session.courseId,
        startDateTime: session.startDateTime,
        endDateTime: session.endDateTime,
        capacity: session.capacity,
        bookedCount: participants.length,
      },
      participants,
      hasParticipants: participants.length > 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/courses/:id/participants", requireInstructor, async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);

    if (!course) {
      return res.status(404).render("error", {
        title: "Course not found",
        message: "The course could not be found.",
      });
    }

    const allBookings = await BookingModel.listByCourse(course._id);

    const enrolments = allBookings.filter(
      (b) => b.type === "COURSE" && b.status !== "CANCELLED"
    );

    const participants = [];

    for (const enrolment of enrolments) {
      const user = await UserModel.findById(enrolment.userId);
      if (!user) continue;

      participants.push({
        id: user._id,
        name: user.name,
        email: user.email,
      });
    }

    res.render("admin_course_participants", {
      title: "Course Participants",
      course: {
        id: course._id,
        title: course.title,
      },
      participants,
      hasParticipants: participants.length > 0,
    });
  } catch (err) {
    next(err);
  }
});
router.get("/admin/users", requireInstructor, async (req, res, next) => {
  try {
    const users = await UserModel.list();

    res.render("admin_users", {
      title: "Manage Users",
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isStudent: u.role === "student",

      })),
      successMessage: req.query.updated === "1"
        ? "User updated successfully."
        : req.query.deleted === "1"
        ? "User deleted successfully."
        : req.query.created === "1"
        ? "User created successfully."
        : req.query.promoted === "1"
        ? "User role updated successfully."
        : "",
    });
  } catch (err) {
    next(err);
  }
});
router.get("/admin/users/new", requireInstructor, (req, res) => {
  res.render("admin_user_new", {
    title: "Create User",
  });
});

router.post("/admin/users/new", requireInstructor, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).render("admin_user_new", {
        title: "Create User",
        error: "Please complete all fields.",
      });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(400).render("admin_user_new", {
        title: "Create User",
        error: "An account with this email already exists.",
      });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await UserModel.create({
      name,
      email,
      passwordHash,
      role: role === "instructor" ? "instructor" : "student",
    });

    res.redirect("/admin/users?created=1");
  } catch (err) {
    next(err);
  }
});
router.get("/admin/users/:id/edit", requireInstructor, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).render("error", {
        title: "User not found",
        message: "The user could not be found.",
      });
    }

    res.render("admin_user_edit", {
      title: "Edit User",
      userData: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isStudent: user.role === "student",
        isInstructor: user.role === "instructor",
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/admin/users/:id/edit", requireInstructor, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).render("error", {
        title: "User not found",
        message: "The user could not be found.",
      });
    }

    const { name, email, password, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).render("admin_user_edit", {
        title: "Edit User",
        error: "Name, email and role are required.",
        userData: {
          id: user._id,
          name,
          email,
          role,
          isStudent: role === "student",
          isInstructor: role === "instructor",
        },
      });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing && existing._id !== user._id) {
      return res.status(400).render("admin_user_edit", {
        title: "Edit User",
        error: "This email is already used by another account.",
        userData: {
          id: user._id,
          name,
          email,
          role,
          isStudent: role === "student",
          isInstructor: role === "instructor",
        },
      });
    }

    const patch = {
      name,
      email,
      role: role === "instructor" ? "instructor" : "student",
    };

    if (password && password.trim() !== "") {
      const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
      patch.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    await UserModel.update(user._id, patch);

    res.redirect("/admin/users?updated=1");
  } catch (err) {
    next(err);
  }
});
router.post("/admin/users/:id/delete", requireInstructor, async (req, res, next) => {
  try {
    await UserModel.removeById(req.params.id);
    res.redirect("/admin/users?deleted=1");
  } catch (err) {
    next(err);
  }
});
router.post("/admin/users/:id/promote", requireInstructor, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).render("error", {
        title: "User not found",
        message: "The user could not be found.",
      });
    }

    await UserModel.update(user._id, {
      role: "instructor",
    });

    res.redirect("/admin/users?promoted=1");
  } catch (err) {
    next(err);
  }
});
router.get("/info", (req, res) => {
  res.render("info", {
    title: "About Our Studio",
  });
});

// Participant session details for one user in one course
router.get(
  "/admin/courses/:courseId/participants/:userId",
  requireInstructor,
  async (req, res, next) => {
    try {
      const course = await CourseModel.findById(req.params.courseId);
      const user = await UserModel.findById(req.params.userId);

      if (!course || !user) {
        return res.status(404).render("error", {
          title: "Not found",
          message: "The participant or course could not be found.",
        });
      }

      const sessionBookings =
  await BookingModel.listSessionBookingsByCourseAndUser(course._id, user._id);

const activeBookings = sessionBookings.filter(
  (booking) => booking.status !== "CANCELLED"
);

const rows = [];

for (const booking of activeBookings) {
        let sessionStart = "";
        let sessionEnd = "";

        if (booking.sessionIds?.length) {
          const session = await SessionModel.findById(booking.sessionIds[0]);
          if (session) {
            sessionStart = session.startDateTime
              ? new Date(session.startDateTime).toLocaleString("en-GB")
              : "";
            sessionEnd = session.endDateTime
              ? new Date(session.endDateTime).toLocaleString("en-GB")
              : "";
          }
        }

        rows.push({
          status: booking.status,
          createdAt: booking.createdAt
            ? new Date(booking.createdAt).toLocaleString("en-GB")
            : "",
          sessionStart,
          sessionEnd,
        });
      }

      res.render("admin_participant_detail", {
        title: "Participant Session Details",
        course: {
          id: course._id,
          title: course.title,
        },
        participant: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        bookings: rows,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
