import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { UserModel } from "../models/userModel.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

export async function resetDb() {
  await initDb();

  await Promise.all([
    usersDb.remove({}, { multi: true }),
    coursesDb.remove({}, { multi: true }),
    sessionsDb.remove({}, { multi: true }),
    bookingsDb.remove({}, { multi: true }),
  ]);

  await Promise.all([
    usersDb.persistence.compactDatafile(),
    coursesDb.persistence.compactDatafile(),
    sessionsDb.persistence.compactDatafile(),
    bookingsDb.persistence.compactDatafile(),
  ]);
}

export async function seedMinimal() {
  const student = await UserModel.create({
    name: "Test Student",
    email: "student@test.local",
    role: "student",
  });

  const instructor = await UserModel.create({
    name: "Test Instructor",
    email: "instructor@test.local",
    role: "instructor",
  });

  const course = await CourseModel.create({
    title: "Test Course",
    level: "beginner",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-02-02",
    endDate: "2026-04-20",
    instructorId: instructor._id,
    sessionIds: [],
    price: 12,
    description: "A test course for route testing.",
  });

  const s1 = await SessionModel.create({
    courseId: course._id,
    startDateTime: new Date("2026-02-02T18:30:00").toISOString(),
    endDateTime: new Date("2026-02-02T19:45:00").toISOString(),
    capacity: 18,
    bookedCount: 0,
    location: "Studio A",
  });

  const s2 = await SessionModel.create({
    courseId: course._id,
    startDateTime: new Date("2026-02-09T18:30:00").toISOString(),
    endDateTime: new Date("2026-02-09T19:45:00").toISOString(),
    capacity: 18,
    bookedCount: 0,
    location: "Studio A",
  });

  await CourseModel.update(course._id, { sessionIds: [s1._id, s2._id] });

  return { student, instructor, course, sessions: [s1, s2] };
}

export async function seedAuthUsers() {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

  const student = await UserModel.create({
    name: "Student Login",
    email: "student@login.local",
    passwordHash: await bcrypt.hash("test123", saltRounds),
    role: "student",
  });

  const instructor = await UserModel.create({
    name: "Instructor Login",
    email: "instructor@login.local",
    passwordHash: await bcrypt.hash("test123", saltRounds),
    role: "instructor",
  });

  return { student, instructor };
}

export function makeAuthCookie(user) {
  const token = jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );

  return `jwt=${token}`;
}
