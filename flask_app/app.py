"""SkillLoop — Flask + SQLite + Jinja2 port of the original React/Supabase platform.

Modules:
  1. User registration & profile management
  2. Course & learning management
  3. Assessment & certification (reportlab PDF)
  4. Job & placement portal
  5. Analytics / Insights (numpy, pandas, matplotlib, scikit-learn K-Means)
"""
import io
import json
import os
from datetime import datetime
from functools import wraps

from flask import (Flask, abort, flash, g, redirect, render_template, request,
                   send_file, send_from_directory, session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

import db as database
from db import execute, query
from seed_data import CATEGORIES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
ALLOWED_RESUME = {".pdf", ".doc", ".docx"}
ALLOWED_IMAGE = {".png", ".jpg", ".jpeg", ".webp"}

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("SECRET_KEY", "skillloop-dev-secret-change-me"),
    MAX_CONTENT_LENGTH=8 * 1024 * 1024,
)
app.teardown_appcontext(database.close_db)
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------- helpers

def current_user():
    if "user" not in g:
        uid = session.get("user_id")
        g.user = query("SELECT * FROM users WHERE id = ?", (uid,), one=True) if uid else None
    return g.user


def login_required(view):
    @wraps(view)
    def wrapped(*a, **kw):
        if not current_user():
            flash("Please sign in to continue.", "error")
            return redirect(url_for("login", next=request.path))
        return view(*a, **kw)
    return wrapped


@app.context_processor
def inject_globals():
    return {
        "user": current_user(),
        "categories": CATEGORIES,
        "year": datetime.now().year,
    }


@app.template_filter("nicedate")
def nicedate(value):
    if not value:
        return ""
    text = str(value)
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text[:len(fmt) + 2].strip(), fmt).strftime("%d %B %Y")
        except ValueError:
            continue
    return text


@app.template_filter("fromjson")
def fromjson(value):
    try:
        return json.loads(value or "[]")
    except (TypeError, ValueError):
        return []


def course_progress(user_id, course_id):
    total = query("SELECT COUNT(*) c FROM lessons WHERE course_id = ?", (course_id,), one=True)["c"]
    done = query("SELECT COUNT(*) c FROM lesson_progress WHERE user_id = ? AND course_id = ?",
                 (user_id, course_id), one=True)["c"]
    percent = 0 if total == 0 else round(done * 100 / total)
    return {"done": done, "total": total, "percent": percent}


# ---------------------------------------------------------------- public pages

@app.route("/")
def index():
    courses = query("SELECT * FROM courses ORDER BY id LIMIT 3")
    stats = [
        ("Learners enrolled", 0),
        ("Course tracks", len(query("SELECT id FROM courses"))),
        ("Certificates issued", query("SELECT COUNT(*) c FROM certificates", one=True)["c"]),
        ("Open roles", query("SELECT COUNT(*) c FROM jobs", one=True)["c"]),
    ]
    return render_template("index.html", courses=courses, stats=stats,
                           title="SkillLoop — Digital Skill Bootcamp for Job-Ready Youth",
                           description="SkillLoop trains unemployed youth in job-ready digital skills and connects graduates to employers.")


@app.route("/about")
def about():
    return render_template("about.html", title="About the Programme — SkillLoop",
                           description="How the SkillLoop digital skill bootcamp trains and places unemployed youth.")


@app.route("/career-guidance")
def career_guidance():
    return render_template("career_guidance.html", title="Career Guidance — SkillLoop",
                           description="Interview preparation, resume guidance and placement support for SkillLoop learners.")


@app.route("/courses")
def courses():
    cat = request.args.get("category", "All")
    if cat != "All":
        rows = query("SELECT * FROM courses WHERE category = ? ORDER BY id", (cat,))
    else:
        rows = query("SELECT * FROM courses ORDER BY id")
    return render_template("courses.html", courses=rows, active=cat,
                           title="Course Catalog — SkillLoop",
                           description="Browse SkillLoop tracks in web development, design, marketing, MS Office and AI basics.")


@app.route("/courses/<slug>")
def course_detail(slug):
    course = query("SELECT * FROM courses WHERE slug = ?", (slug,), one=True)
    if not course:
        abort(404)
    lessons = query("SELECT * FROM lessons WHERE course_id = ? ORDER BY position", (course["id"],))
    quiz = query("SELECT * FROM quizzes WHERE course_id = ?", (course["id"],), one=True)
    enrolled = False
    if current_user():
        enrolled = bool(query("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?",
                              (current_user()["id"], course["id"]), one=True))
    return render_template("course_detail.html", course=course, lessons=lessons, quiz=quiz,
                           enrolled=enrolled, title=f"{course['title']} — SkillLoop",
                           description=course["summary"])


@app.route("/courses/<slug>/enroll", methods=["POST"])
@login_required
def enroll(slug):
    course = query("SELECT * FROM courses WHERE slug = ?", (slug,), one=True)
    if not course:
        abort(404)
    execute("INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?,?)",
            (current_user()["id"], course["id"]))
    flash(f"Enrolled in {course['title']}.", "success")
    return redirect(url_for("learn", slug=slug))


# ---------------------------------------------------------------- auth

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        if not full_name or not email or len(password) < 6:
            flash("Enter your name, a valid email and a password of at least 6 characters.", "error")
        elif query("SELECT id FROM users WHERE email = ?", (email,), one=True):
            flash("An account with that email already exists.", "error")
        else:
            uid = execute(
                "INSERT INTO users (email, password_hash, full_name, role) VALUES (?,?,?,?)",
                (email, generate_password_hash(password), full_name, "learner"))
            session.clear()
            session["user_id"] = uid
            flash("Welcome to SkillLoop.", "success")
            return redirect(url_for("dashboard"))
    return render_template("register.html", title="Create your account — SkillLoop",
                           description="Register as a SkillLoop learner and start a digital skill track.")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        row = query("SELECT * FROM users WHERE email = ?", (email,), one=True)
        if row and check_password_hash(row["password_hash"], password):
            session.clear()
            session["user_id"] = row["id"]
            return redirect(request.args.get("next") or url_for("dashboard"))
        flash("Incorrect email or password.", "error")
    return render_template("login.html", title="Learner login — SkillLoop",
                           description="Sign in to your SkillLoop learner account.")


@app.route("/logout", methods=["POST", "GET"])
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    reset_link = None
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        row = query("SELECT id FROM users WHERE email = ?", (email,), one=True)
        if row:
            token = database.new_certificate_code()
            session["reset_user"] = row["id"]
            session["reset_token"] = token
            reset_link = url_for("reset_password", token=token)
        flash("If that account exists, a reset link has been created below.", "success")
    return render_template("forgot_password.html", reset_link=reset_link,
                           title="Reset your password — SkillLoop",
                           description="Request a password reset link for your SkillLoop account.")


@app.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):
    if session.get("reset_token") != token:
        flash("That reset link is no longer valid.", "error")
        return redirect(url_for("forgot_password"))
    if request.method == "POST":
        password = request.form.get("password", "")
        if len(password) < 6:
            flash("Password must be at least 6 characters.", "error")
        else:
            execute("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
                    (generate_password_hash(password), session["reset_user"]))
            session.pop("reset_token", None)
            session.pop("reset_user", None)
            flash("Password updated. You can sign in now.", "success")
            return redirect(url_for("login"))
    return render_template("reset_password.html", title="Set a new password — SkillLoop",
                           description="Choose a new password for your SkillLoop account.")


# ---------------------------------------------------------------- dashboard

@app.route("/dashboard")
@login_required
def dashboard():
    uid = current_user()["id"]
    enrollments = query(
        """SELECT e.*, c.title, c.slug, c.category FROM enrollments e
           JOIN courses c ON c.id = e.course_id WHERE e.user_id = ?
           ORDER BY e.enrolled_at DESC""", (uid,))
    progress = {e["course_id"]: course_progress(uid, e["course_id"]) for e in enrollments}
    certificates = query("SELECT COUNT(*) c FROM certificates WHERE user_id = ?", (uid,), one=True)["c"]
    applications = query("SELECT COUNT(*) c FROM applications WHERE user_id = ?", (uid,), one=True)["c"]
    attempts = query(
        """SELECT r.*, q.title FROM quiz_results r JOIN quizzes q ON q.id = r.quiz_id
           WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 5""", (uid,))
    recommended = query("SELECT * FROM jobs ORDER BY posted_at DESC LIMIT 3")
    return render_template("dashboard.html", enrollments=enrollments, progress=progress,
                           certificates=certificates, applications=applications,
                           attempts=attempts, recommended=recommended,
                           title="Learner Dashboard — SkillLoop",
                           description="Your SkillLoop progress, assessments, certificates and applications.")


@app.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    uid = current_user()["id"]
    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        age = request.form.get("age", "").strip()
        education = request.form.get("education", "").strip()
        skills = [s.strip() for s in request.form.get("skills", "").split(",") if s.strip()]
        resume_name = current_user()["resume_name"]
        avatar_name = current_user()["avatar_name"]

        resume = request.files.get("resume")
        if resume and resume.filename:
            ext = os.path.splitext(resume.filename)[1].lower()
            if ext not in ALLOWED_RESUME:
                flash("Resume must be a PDF or Word document.", "error")
                return redirect(url_for("profile"))
            resume_name = f"resume-{uid}{ext}"
            resume.save(os.path.join(UPLOAD_DIR, secure_filename(resume_name)))

        photo = request.files.get("avatar")
        if photo and photo.filename:
            ext = os.path.splitext(photo.filename)[1].lower()
            if ext not in ALLOWED_IMAGE:
                flash("Profile photo must be a PNG, JPG or WebP image.", "error")
                return redirect(url_for("profile"))
            avatar_name = f"avatar-{uid}{ext}"
            photo.save(os.path.join(UPLOAD_DIR, secure_filename(avatar_name)))

        execute("""UPDATE users SET full_name=?, age=?, education=?, skills=?, resume_name=?,
                   avatar_name=?, updated_at=datetime('now') WHERE id=?""",
                (full_name, int(age) if age.isdigit() else None, education,
                 json.dumps(skills), resume_name, avatar_name, uid))
        g.pop("user", None)
        flash("Profile saved.", "success")
        return redirect(url_for("profile"))
    return render_template("profile.html", title="Profile — SkillLoop",
                           description="Manage your SkillLoop learner profile, skills, resume and photo.")


@app.route("/uploads/<name>")
@login_required
def uploaded_file(name):
    return send_from_directory(UPLOAD_DIR, secure_filename(name))


@app.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    if request.method == "POST":
        current = request.form.get("current_password", "")
        new = request.form.get("new_password", "")
        if not check_password_hash(current_user()["password_hash"], current):
            flash("Current password is incorrect.", "error")
        elif len(new) < 6:
            flash("New password must be at least 6 characters.", "error")
        else:
            execute("UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?",
                    (generate_password_hash(new), current_user()["id"]))
            flash("Password changed.", "success")
            return redirect(url_for("settings"))
    return render_template("settings.html", title="Account Settings — SkillLoop",
                           description="Update your SkillLoop account password and security details.")


# ---------------------------------------------------------------- learning

@app.route("/my-courses")
@login_required
def my_courses():
    uid = current_user()["id"]
    rows = query("""SELECT e.course_id, c.* FROM enrollments e JOIN courses c ON c.id = e.course_id
                    WHERE e.user_id = ? ORDER BY e.enrolled_at DESC""", (uid,))
    progress = {r["course_id"]: course_progress(uid, r["course_id"]) for r in rows}
    return render_template("my_courses.html", courses=rows, progress=progress,
                           title="My Courses — SkillLoop",
                           description="Track the SkillLoop course tracks you are enrolled in.")


@app.route("/learn/<slug>")
@login_required
def learn(slug):
    uid = current_user()["id"]
    course = query("SELECT * FROM courses WHERE slug = ?", (slug,), one=True)
    if not course:
        abort(404)
    if not query("SELECT id FROM enrollments WHERE user_id=? AND course_id=?", (uid, course["id"]), one=True):
        flash("Enrol in this track to open the learning view.", "error")
        return redirect(url_for("course_detail", slug=slug))
    lessons = query("SELECT * FROM lessons WHERE course_id = ? ORDER BY position", (course["id"],))
    done_ids = {r["lesson_id"] for r in query(
        "SELECT lesson_id FROM lesson_progress WHERE user_id=? AND course_id=?", (uid, course["id"]))}
    active_id = request.args.get("lesson", type=int)
    active = next((l for l in lessons if l["id"] == active_id), lessons[0] if lessons else None)
    quiz = query("SELECT * FROM quizzes WHERE course_id = ?", (course["id"],), one=True)
    return render_template("learn.html", course=course, lessons=lessons, done_ids=done_ids,
                           active=active, quiz=quiz, progress=course_progress(uid, course["id"]),
                           title=f"Learn: {course['title']} — SkillLoop",
                           description=f"Work through the {course['title']} modules and track progress.")


@app.route("/learn/<slug>/complete/<int:lesson_id>", methods=["POST"])
@login_required
def complete_lesson(slug, lesson_id):
    uid = current_user()["id"]
    course = query("SELECT * FROM courses WHERE slug = ?", (slug,), one=True)
    if not course:
        abort(404)
    existing = query("SELECT id FROM lesson_progress WHERE user_id=? AND lesson_id=?", (uid, lesson_id), one=True)
    if existing:
        execute("DELETE FROM lesson_progress WHERE id = ?", (existing["id"],))
    else:
        execute("INSERT INTO lesson_progress (user_id, course_id, lesson_id) VALUES (?,?,?)",
                (uid, course["id"], lesson_id))
    return redirect(url_for("learn", slug=slug, lesson=lesson_id))


# ---------------------------------------------------------------- assessment

@app.route("/assessments")
@login_required
def assessments():
    uid = current_user()["id"]
    quizzes = query("""SELECT q.*, c.title AS course_title, c.slug, c.category
                       FROM quizzes q JOIN courses c ON c.id = q.course_id ORDER BY c.id""")
    counts = {r["quiz_id"]: r["n"] for r in query("SELECT quiz_id, COUNT(*) n FROM questions GROUP BY quiz_id")}
    attempts = query("""SELECT r.*, q.title AS quiz_title, c.title AS course_title
                        FROM quiz_results r JOIN quizzes q ON q.id = r.quiz_id
                        JOIN courses c ON c.id = r.course_id
                        WHERE r.user_id = ? ORDER BY r.created_at DESC""", (uid,))
    return render_template("assessments.html", quizzes=quizzes, counts=counts, attempts=attempts,
                           title="Assessments — SkillLoop",
                           description="Take graded SkillLoop assessments and review your attempt history.")


@app.route("/quiz/<int:quiz_id>", methods=["GET", "POST"])
@login_required
def quiz(quiz_id):
    uid = current_user()["id"]
    quiz_row = query("""SELECT q.*, c.title AS course_title, c.slug FROM quizzes q
                        JOIN courses c ON c.id = q.course_id WHERE q.id = ?""", (quiz_id,), one=True)
    if not quiz_row:
        abort(404)
    questions = query("SELECT * FROM questions WHERE quiz_id = ? ORDER BY position", (quiz_id,))

    if request.method == "POST":
        answers, score = [], 0
        for q in questions:
            picked = request.form.get(f"q{q['id']}")
            picked = int(picked) if picked is not None and picked.isdigit() else -1
            answers.append({"question_id": q["id"], "picked": picked, "correct": q["correct_index"]})
            if picked == q["correct_index"]:
                score += 1
        total = len(questions)
        percent = 0 if total == 0 else round(score * 100 / total)
        passed = percent >= quiz_row["pass_percentage"]
        result_id = execute(
            """INSERT INTO quiz_results (user_id, quiz_id, course_id, score, total, passed, answers)
               VALUES (?,?,?,?,?,?,?)""",
            (uid, quiz_id, quiz_row["course_id"], score, total, 1 if passed else 0, json.dumps(answers)))
        if passed and not query("SELECT id FROM certificates WHERE user_id=? AND course_id=?",
                                (uid, quiz_row["course_id"]), one=True):
            execute("INSERT INTO certificates (user_id, course_id, code) VALUES (?,?,?)",
                    (uid, quiz_row["course_id"], database.new_certificate_code()))
        return redirect(url_for("quiz_result", result_id=result_id))

    return render_template("quiz.html", quiz=quiz_row, questions=questions,
                           title=f"{quiz_row['title']} — SkillLoop",
                           description=quiz_row["description"])


@app.route("/quiz-result/<int:result_id>")
@login_required
def quiz_result(result_id):
    row = query("""SELECT r.*, q.title AS quiz_title, q.pass_percentage, c.title AS course_title, c.id AS cid
                   FROM quiz_results r JOIN quizzes q ON q.id = r.quiz_id
                   JOIN courses c ON c.id = r.course_id WHERE r.id = ? AND r.user_id = ?""",
                (result_id, current_user()["id"]), one=True)
    if not row:
        abort(404)
    percent = 0 if row["total"] == 0 else round(row["score"] * 100 / row["total"])
    return render_template("quiz_result.html", r=row, percent=percent,
                           title=f"Result: {row['quiz_title']} — SkillLoop",
                           description="Your SkillLoop assessment result and certification status.")


@app.route("/certificates")
@login_required
def certificates():
    rows = query("""SELECT ce.*, c.title, c.category, c.slug FROM certificates ce
                    JOIN courses c ON c.id = ce.course_id WHERE ce.user_id = ?
                    ORDER BY ce.issued_at DESC""", (current_user()["id"],))
    return render_template("certificates.html", certificates=rows,
                           title="Certificates — SkillLoop",
                           description="Certificates issued for the SkillLoop assessments you have passed.")


def _certificate(course_id):
    return query("""SELECT ce.*, c.title, c.category, c.instructor_name FROM certificates ce
                    JOIN courses c ON c.id = ce.course_id
                    WHERE ce.user_id = ? AND ce.course_id = ?""",
                 (current_user()["id"], course_id), one=True)


@app.route("/certificates/<int:course_id>")
@login_required
def certificate_detail(course_id):
    cert = _certificate(course_id)
    if not cert:
        abort(404)
    return render_template("certificate_detail.html", c=cert,
                           title=f"Certificate: {cert['title']} — SkillLoop",
                           description="View and download your SkillLoop certificate of completion.")


@app.route("/certificates/<int:course_id>/download")
@login_required
def certificate_pdf(course_id):
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.pdfgen import canvas as pdfcanvas

    cert = _certificate(course_id)
    if not cert:
        abort(404)
    buf = io.BytesIO()
    width, height = landscape(A4)
    c = pdfcanvas.Canvas(buf, pagesize=landscape(A4))

    ivory, navy, gold, charcoal, grey = (HexColor("#FAF8F3"), HexColor("#1B2A4A"),
                                         HexColor("#C9A227"), HexColor("#1C1C1C"), HexColor("#8A8A8A"))
    c.setFillColor(ivory)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setStrokeColor(navy)
    c.setLineWidth(3)
    c.rect(28, 28, width - 56, height - 56, stroke=1, fill=0)
    c.setStrokeColor(gold)
    c.setLineWidth(1)
    c.rect(40, 40, width - 80, height - 80, stroke=1, fill=0)

    c.setFillColor(navy)
    c.setFont("Times-Bold", 30)
    c.drawCentredString(width / 2, height - 110, "SkillLoop")
    c.setFillColor(grey)
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, height - 130, "DIGITAL SKILL BOOTCAMP")

    c.setFillColor(charcoal)
    c.setFont("Times-Roman", 15)
    c.drawCentredString(width / 2, height - 185, "This certifies that")
    c.setFillColor(navy)
    c.setFont("Times-Bold", 34)
    c.drawCentredString(width / 2, height - 235, current_user()["full_name"] or current_user()["email"])
    c.setFillColor(charcoal)
    c.setFont("Times-Roman", 15)
    c.drawCentredString(width / 2, height - 275, "has successfully completed the assessed programme")
    c.setFillColor(navy)
    c.setFont("Times-Bold", 22)
    c.drawCentredString(width / 2, height - 315, cert["title"])

    c.setStrokeColor(gold)
    c.setLineWidth(2)
    c.line(width / 2 - 120, height - 335, width / 2 + 120, height - 335)

    c.setFillColor(grey)
    c.setFont("Helvetica", 10)
    c.drawString(70, 90, "CERTIFICATE ID")
    c.drawRightString(width - 70, 90, "ISSUED")
    c.setFillColor(charcoal)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(70, 72, cert["code"])
    c.drawRightString(width - 70, 72, nicedate(cert["issued_at"]))
    c.setFillColor(grey)
    c.setFont("Helvetica", 9)
    c.drawCentredString(width / 2, 55, f"Instructor: {cert['instructor_name']}  ·  Track: {cert['category']}")

    c.showPage()
    c.save()
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf", as_attachment=True,
                     download_name=f"skillloop-certificate-{cert['code']}.pdf")


# ---------------------------------------------------------------- jobs

@app.route("/jobs")
def jobs():
    q = request.args.get("q", "").strip()
    cat = request.args.get("category", "All")
    sql = "SELECT * FROM jobs WHERE 1=1"
    params = []
    if q:
        sql += " AND (title LIKE ? OR company LIKE ? OR location LIKE ?)"
        params += [f"%{q}%"] * 3
    if cat != "All":
        sql += " AND category = ?"
        params.append(cat)
    rows = query(sql + " ORDER BY posted_at DESC", tuple(params))
    return render_template("jobs.html", jobs=rows, q=q, active=cat,
                           title="Job Portal — SkillLoop",
                           description="Entry-level roles and internships open to SkillLoop graduates.")


@app.route("/jobs/<int:job_id>")
def job_detail(job_id):
    job = query("SELECT * FROM jobs WHERE id = ?", (job_id,), one=True)
    if not job:
        abort(404)
    applied = False
    if current_user():
        applied = bool(query("SELECT id FROM applications WHERE user_id=? AND job_id=?",
                             (current_user()["id"], job_id), one=True))
    return render_template("job_detail.html", job=job, applied=applied,
                           title=f"{job['title']} at {job['company']} — SkillLoop",
                           description=job["description"][:155])


@app.route("/jobs/<int:job_id>/apply", methods=["POST"])
@login_required
def apply_job(job_id):
    if not query("SELECT id FROM jobs WHERE id = ?", (job_id,), one=True):
        abort(404)
    execute("INSERT OR IGNORE INTO applications (user_id, job_id, note) VALUES (?,?,?)",
            (current_user()["id"], job_id, request.form.get("note", "").strip()))
    flash("Application submitted.", "success")
    return redirect(url_for("applications"))


@app.route("/applications")
@login_required
def applications():
    rows = query("""SELECT a.*, j.title, j.company, j.location, j.category FROM applications a
                    JOIN jobs j ON j.id = a.job_id WHERE a.user_id = ?
                    ORDER BY a.applied_at DESC""", (current_user()["id"],))
    return render_template("applications.html", applications=rows,
                           title="My Applications — SkillLoop",
                           description="Track the status of every job application you have submitted.")


@app.route("/applications/<int:app_id>/withdraw", methods=["POST"])
@login_required
def withdraw_application(app_id):
    execute("DELETE FROM applications WHERE id = ? AND user_id = ?", (app_id, current_user()["id"]))
    flash("Application withdrawn.", "success")
    return redirect(url_for("applications"))


# ---------------------------------------------------------------- module 5: insights

@app.route("/insights")
@login_required
def insights():
    import analytics
    data = analytics.build_insights(get_conn=database.get_db)
    return render_template("insights.html", d=data,
                           title="Analytics & Insights — SkillLoop",
                           description="Platform analytics: enrolments by category, pass rates, placements and K-Means learner skill tiers.")


@app.route("/insights/chart/<name>.png")
@login_required
def insight_chart(name):
    import analytics
    buf = analytics.chart(name, get_conn=database.get_db)
    if buf is None:
        abort(404)
    return send_file(buf, mimetype="image/png")


# ---------------------------------------------------------------- errors

@app.errorhandler(404)
def not_found(_e):
    return render_template("404.html", title="Page not found — SkillLoop",
                           description="The page you requested does not exist."), 404


with app.app_context():
    database.init_db()

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
