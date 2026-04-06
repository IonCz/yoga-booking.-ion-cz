import request from "supertest";
import { app } from "../index.js";
import {
  resetDb,
  seedMinimal,
  seedAuthUsers,
  makeAuthCookie,
} from "./helpers.js";

describe("Protected student pages", () => {
  let course;
  let student;
  let instructor;

  beforeEach(async () => {
    await resetDb();
    const data = await seedMinimal();
    const authUsers = await seedAuthUsers();

    course = data.course;
    student = authUsers.student;
    instructor = authUsers.instructor;
  });

  test("GET /my/courses redirects anonymous user to login", async () => {
    const res = await request(app).get("/my/courses");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });

  test("GET /my/courses allows student", async () => {
    const res = await request(app)
      .get("/my/courses")
      .set("Cookie", makeAuthCookie(student));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  test("GET /my/courses blocks instructor with 403", async () => {
    const res = await request(app)
      .get("/my/courses")
      .set("Cookie", makeAuthCookie(instructor));

    expect(res.status).toBe(403);
    expect(res.text).toMatch(/student/i);
  });

  test("POST /courses/:id/book redirects anonymous user to login", async () => {
    const res = await request(app).post(`/courses/${course._id}/book`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });
});