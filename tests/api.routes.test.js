import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { UserModel } from "../models/userModel.js";

describe("JSON API routes", () => {
  let data;
  let student;

  beforeEach(async () => {
    await resetDb();
    data = await seedMinimal();

    student = await UserModel.create({
      name: "API Student",
      email: "api@student.local",
      role: "student",
    });
  });

  test("GET /api/courses returns array of courses", async () => {
    const res = await request(app).get("/api/courses");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(Array.isArray(res.body.courses)).toBe(true);
    expect(res.body.courses.some((c) => c.title === "Test Course")).toBe(true);
  });

  test("POST /api/courses creates a course", async () => {
    const payload = {
      title: "API Created Course",
      level: "advanced",
      type: "WEEKEND_WORKSHOP",
      allowDropIn: false,
      startDate: "2026-05-01",
      endDate: "2026-05-02",
      instructorId: data.instructor._id,
      price: 25,
      description: "Created via API route.",
    };

    const res = await request(app).post("/api/courses").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.course).toBeDefined();
    expect(res.body.course.title).toBe("API Created Course");
  });

  test("GET /api/courses/:id returns course and sessions", async () => {
    const res = await request(app).get(`/api/courses/${data.course._id}`);

    expect(res.status).toBe(200);
    expect(res.body.course._id).toBe(data.course._id);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBe(2);
  });

  test("POST /api/sessions creates a session", async () => {
    const payload = {
      courseId: data.course._id,
      startDateTime: new Date("2026-02-16T18:30:00").toISOString(),
      endDateTime: new Date("2026-02-16T19:45:00").toISOString(),
      capacity: 16,
      location: "Studio B",
    };

    const res = await request(app).post("/api/sessions").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.courseId).toBe(data.course._id);
  });

  test("GET /api/sessions/by-course/:courseId returns sessions array", async () => {
    const res = await request(app).get(`/api/sessions/by-course/${data.course._id}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(2);
  });

  test("POST /api/bookings/course creates a course booking", async () => {
    const res = await request(app).post("/api/bookings/course").send({
      userId: student._id,
      courseId: data.course._id,
    });

    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.type).toBe("COURSE");
    expect(res.body.booking.status).toBe("CONFIRMED");
  });

  test("POST /api/bookings/session creates a session booking after enrolment", async () => {
    const enrol = await request(app).post("/api/bookings/course").send({
      userId: student._id,
      courseId: data.course._id,
    });

    expect(enrol.status).toBe(201);

    const res = await request(app).post("/api/bookings/session").send({
      userId: student._id,
      sessionId: data.sessions[0]._id,
    });

    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.type).toBe("SESSION");
    expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
  });

  test("DELETE /api/bookings/:id cancels a booking", async () => {
    await request(app).post("/api/bookings/course").send({
      userId: student._id,
      courseId: data.course._id,
    });

    const create = await request(app).post("/api/bookings/session").send({
      userId: student._id,
      sessionId: data.sessions[1]._id,
    });

    expect(create.status).toBe(201);

    const bookingId = create.body.booking._id;
    const del = await request(app).delete(`/api/bookings/${bookingId}`);

    expect(del.status).toBe(200);
    expect(del.body.booking.status).toBe("CANCELLED");
  });
});