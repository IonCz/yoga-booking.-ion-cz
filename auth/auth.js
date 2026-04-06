import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "../loadEnv.js";
import { UserModel } from "../models/userModel.js";

function makeToken(user) {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    throw new Error("ACCESS_TOKEN_SECRET is not set");
  }

  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn: "1d" }
  );
}

export async function register(req, res, next) {
  try {
    const { name, email, password} = req.body;

    if (!name || !email || !password) {
      return res.status(400).render("register", {
        title: "Register",
        error: "Please complete all required fields.",
      });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(400).render("register", {
        title: "Register",
        error: "An account with this email already exists.",
      });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await UserModel.create({
    name,
    email,
    passwordHash,
    role: "student",
    });

    const token = makeToken(user);

    res.cookie("jwt", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.redirect("/");
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Login",
        error: "Please enter both email and password.",
      });
    }

    const user = await UserModel.findByEmail(email);

    if (!user || !user.passwordHash) {
      return res.status(403).render("login", {
        title: "Login",
        error: "Invalid email or password.",
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      return res.status(403).render("login", {
        title: "Login",
        error: "Invalid email or password.",
      });
    }

    const token = makeToken(user);

    res.cookie("jwt", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.redirect("/");
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  res.clearCookie("jwt").redirect("/");
}

export async function attachUser(req, res, next) {
  try {
    const accessToken = req.cookies?.jwt;

    if (!accessToken) {
      req.user = null;
      res.locals.user = null;
      res.locals.isStudent = false;
      res.locals.isInstructor = false;
      return next();
    }

    const secret = process.env.ACCESS_TOKEN_SECRET;
    const payload = jwt.verify(accessToken, secret);

    const user = await UserModel.findById(payload.id);

    if (!user) {
      req.user = null;
      res.locals.user = null;
      res.locals.isStudent = false;
      res.locals.isInstructor = false;
      return next();
    }

    req.user = user;
    res.locals.user = user;
    res.locals.isStudent = user.role === "student";
    res.locals.isInstructor = user.role === "instructor";

    return next();
  } catch (err) {
    req.user = null;
    res.locals.user = null;
    res.locals.isStudent = false;
    res.locals.isInstructor = false;
    return next();
  }
}

export function verify(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }
  next();
}