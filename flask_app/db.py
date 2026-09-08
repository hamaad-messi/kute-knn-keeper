"""SQLite access layer (built-in sqlite3 module) — replaces Supabase."""
import json
import os
import sqlite3
import secrets

from flask import g

import seed_data

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "skillloop.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'learner',
  age INTEGER,
  education TEXT,
  skills TEXT NOT NULL DEFAULT '[]',
  resume_name TEXT,
  avatar_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'Beginner',
  duration_weeks INTEGER NOT NULL DEFAULT 6,
  instructor_name TEXT NOT NULL DEFAULT '',
  instructor_title TEXT NOT NULL DEFAULT '',
  instructor_bio TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'video',
  duration_min INTEGER NOT NULL DEFAULT 12,
  position INTEGER NOT NULL DEFAULT 1,
  body TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  pass_percentage INTEGER NOT NULL DEFAULT 60,
  time_limit_min INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  prompt TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  answers TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'Full-time',
  category TEXT NOT NULL,
  salary_range TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '[]',
  company_about TEXT NOT NULL DEFAULT '',
  posted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Applied',
  note TEXT NOT NULL DEFAULT '',
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, job_id)
);
"""


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def query(sql, params=(), one=False):
    cur = get_db().execute(sql, params)
    rows = cur.fetchall()
    cur.close()
    return (rows[0] if rows else None) if one else rows


def execute(sql, params=()):
    db = get_db()
    cur = db.execute(sql, params)
    db.commit()
    last = cur.lastrowid
    cur.close()
    return last


def new_certificate_code():
    return "SL-" + secrets.token_hex(4).upper()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    conn.commit()
    seed(conn)
    conn.close()


def seed(conn):
    if conn.execute("SELECT COUNT(*) c FROM courses").fetchone()["c"]:
        return

    for c in seed_data.COURSES:
        conn.execute(
            """INSERT INTO courses (slug,title,category,summary,description,level,
               duration_weeks,instructor_name,instructor_title,instructor_bio)
               VALUES (?,?,?,?,?,?,?,?,?,?)""", c)

    course_ids = {r["slug"]: r["id"] for r in conn.execute("SELECT id,slug FROM courses")}

    for slug, title, kind, dur, pos, body in seed_data.LESSONS:
        conn.execute(
            "INSERT INTO lessons (course_id,title,kind,duration_min,position,body) VALUES (?,?,?,?,?,?)",
            (course_ids[slug], title, kind, dur, pos, body))

    for slug, title, desc, pct, tl in seed_data.QUIZZES:
        conn.execute(
            "INSERT INTO quizzes (course_id,title,description,pass_percentage,time_limit_min) VALUES (?,?,?,?,?)",
            (course_ids[slug], title, desc, pct, tl))

    quiz_ids = {}
    for r in conn.execute("SELECT q.id, c.slug FROM quizzes q JOIN courses c ON c.id=q.course_id"):
        quiz_ids[r["slug"]] = r["id"]

    for slug, pos, prompt, options, correct in seed_data.QUESTIONS:
        conn.execute(
            "INSERT INTO questions (quiz_id,position,prompt,options,correct_index) VALUES (?,?,?,?,?)",
            (quiz_ids[slug], pos, prompt, json.dumps(options), correct))

    for j in seed_data.JOBS:
        title, company, loc, jtype, cat, salary, desc, reqs, about, posted = j
        conn.execute(
            """INSERT INTO jobs (title,company,location,job_type,category,salary_range,
               description,requirements,company_about,posted_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (title, company, loc, jtype, cat, salary, desc, json.dumps(reqs), about, posted))

    conn.commit()
