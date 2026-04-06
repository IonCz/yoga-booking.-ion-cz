import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedAuthUsers } from "./helpers.js";

describe("Authentication routes", () => {
  beforeEach(async () => {
    await resetDb();
    await seedAuthUsers();
  });

  test("POST /register creates account and redirects", async () => {
    const res = await request(app).post("/register").type("form").send({
      name: "New Student",
      email: "new@student.local",
      password: "test123",
    });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("POST /login with valid credentials redirects home", async () => {
    const res = await request(app).post("/login").type("form").send({
      email: "student@login.local",
      password: "test123",
    });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("POST /login with wrong password returns 403", async () => {
    const res = await request(app).post("/login").type("form").send({
      email: "student@login.local",
      password: "wrongpass",
    });

    expect(res.status).toBe(403);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/invalid email or password/i);
  });

  test("GET /logout redirects home", async () => {
    const login = await request(app).post("/login").type("form").send({
      email: "student@login.local",
      password: "test123",
    });

    const cookie = login.headers["set-cookie"][0];

    const res = await request(app).get("/logout").set("Cookie", cookie);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });
});