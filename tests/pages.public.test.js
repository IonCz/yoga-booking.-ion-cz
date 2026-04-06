import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";

describe("Public SSR pages", () => {
  let data;

  beforeEach(async () => {
    await resetDb();
    data = await seedMinimal();
  });

  test("GET / renders home page", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Yoga|Courses|Mindfulness/i);
  });

  test("GET /courses renders courses page and shows seeded course", async () => {
    const res = await request(app).get("/courses");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /courses/:id renders course detail page", async () => {
    const res = await request(app).get(`/courses/${data.course._id}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /login renders login page", async () => {
    const res = await request(app).get("/login");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/login/i);
  });

  test("GET /register renders register page", async () => {
    const res = await request(app).get("/register");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/register/i);
  });
});