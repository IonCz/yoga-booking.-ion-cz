import request from "supertest";
import { app } from "../index.js";
import { resetDb } from "./helpers.js";

describe("Route error cases", () => {
  beforeEach(async () => {
    await resetDb();
  });

  test("GET /api/courses/:id with bad id returns 404 JSON", async () => {
    const res = await request(app).get("/api/courses/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.error).toMatch(/course not found/i);
  });

  test("GET /courses/:id with bad id returns 404 HTML", async () => {
    const res = await request(app).get("/courses/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/course not found|not found/i);
  });

  test("POST /api/bookings/session with invalid sessionId returns error", async () => {
    const res = await request(app).post("/api/bookings/session").send({
      userId: "invalid-user",
      sessionId: "invalid-session",
    });

    expect([400, 500]).toContain(res.status);
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});