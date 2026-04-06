import request from "supertest";
import { app } from "../index.js";
import {
  resetDb,
  seedMinimal,
  seedAuthUsers,
  makeAuthCookie,
} from "./helpers.js";

describe("Admin and instructor pages", () => {
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

  test("GET /admin redirects anonymous user to login", async () => {
    const res = await request(app).get("/admin");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });

  test("GET /admin blocks student with 403", async () => {
    const res = await request(app)
      .get("/admin")
      .set("Cookie", makeAuthCookie(student));

    expect(res.status).toBe(403);
    expect(res.text).toMatch(/instructor/i);
  });

  test("GET /admin allows instructor", async () => {
    const res = await request(app)
      .get("/admin")
      .set("Cookie", makeAuthCookie(instructor));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  test("GET /admin/courses/:id/edit allows instructor", async () => {
    const res = await request(app)
      .get(`/admin/courses/${course._id}/edit`)
      .set("Cookie", makeAuthCookie(instructor));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/edit course/i);
  });
});