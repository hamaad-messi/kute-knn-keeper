"""Module 5 — Python analytics: pandas aggregation, matplotlib charts and
scikit-learn K-Means clustering of learners into skill tiers."""
import io

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

IVORY = "#FAF8F3"
NAVY = "#1B2A4A"
GOLD = "#C9A227"
CHARCOAL = "#1C1C1C"
GREY = "#8A8A8A"
SERIES = [NAVY, GOLD, GREY, "#3C5488", "#A8842A"]


def _frames(conn):
    def df(sql):
        return pd.read_sql_query(sql, conn)

    enrol = df("""SELECT e.user_id, c.category, e.enrolled_at
                  FROM enrollments e JOIN courses c ON c.id = e.course_id""")
    results = df("""SELECT r.user_id, r.score, r.total, r.passed, r.created_at, c.category
                    FROM quiz_results r JOIN courses c ON c.id = r.course_id""")
    prog = df("SELECT user_id, course_id, lesson_id FROM lesson_progress")
    lessons = df("SELECT course_id, COUNT(*) AS total_lessons FROM lessons GROUP BY course_id")
    apps = df("SELECT user_id, status, applied_at FROM applications")
    users = df("SELECT id AS user_id, full_name, email FROM users")
    return enrol, results, prog, lessons, apps, users


def learner_table(conn):
    """Per-learner feature table: mean quiz percentage and completion percentage."""
    enrol, results, prog, lessons, apps, users = _frames(conn)
    if users.empty:
        return pd.DataFrame(columns=["user_id", "full_name", "quiz_score", "completion", "tier"])

    if not results.empty:
        results["percent"] = np.where(results["total"] > 0, results["score"] / results["total"] * 100, 0.0)
        quiz = results.groupby("user_id")["percent"].mean().rename("quiz_score")
    else:
        quiz = pd.Series(dtype=float, name="quiz_score")

    if not prog.empty and not lessons.empty and not enrol.empty:
        done = prog.groupby(["user_id", "course_id"]).size().rename("done").reset_index()
        done = done.merge(lessons, on="course_id", how="left")
        done["pct"] = np.where(done["total_lessons"] > 0, done["done"] / done["total_lessons"] * 100, 0.0)
        completion = done.groupby("user_id")["pct"].mean().rename("completion")
    else:
        completion = pd.Series(dtype=float, name="completion")

    table = users.merge(quiz, on="user_id", how="left").merge(completion, on="user_id", how="left")
    table[["quiz_score", "completion"]] = table[["quiz_score", "completion"]].fillna(0.0)

    active = table[(table["quiz_score"] > 0) | (table["completion"] > 0)].copy()
    table["tier"] = "Unassessed"
    if len(active) >= 3:
        k = min(3, len(active))
        X = active[["quiz_score", "completion"]].to_numpy(dtype=float)
        km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
        active["cluster"] = km.labels_
        strength = km.cluster_centers_.mean(axis=1)
        order = np.argsort(strength)
        names = ["Foundation", "Developing", "Job-Ready"][-k:]
        mapping = {int(c): names[i] for i, c in enumerate(order)}
        active["tier"] = active["cluster"].map(mapping)
        table.loc[active.index, "tier"] = active["tier"]
    elif len(active):
        table.loc[active.index, "tier"] = "Developing"
    return table


def build_insights(get_conn):
    conn = get_conn()
    enrol, results, prog, lessons, apps, users = _frames(conn)
    table = learner_table(conn)

    pass_rate = 0.0
    if not results.empty:
        pass_rate = round(float(results["passed"].mean()) * 100, 1)
    avg_score = 0.0
    if not results.empty:
        avg_score = round(float(np.where(results["total"] > 0, results["score"] / results["total"] * 100, 0).mean()), 1)

    by_cat = (enrol.groupby("category").size().sort_values(ascending=False)
              if not enrol.empty else pd.Series(dtype=int))
    tiers = table[table["tier"] != "Unassessed"]["tier"].value_counts()

    return {
        "learners": int(len(users)),
        "enrolments": int(len(enrol)),
        "attempts": int(len(results)),
        "pass_rate": pass_rate,
        "avg_score": avg_score,
        "applications": int(len(apps)),
        "by_category": [(k, int(v)) for k, v in by_cat.items()],
        "tiers": [(k, int(v)) for k, v in tiers.items()],
        "learner_rows": table.sort_values("quiz_score", ascending=False).head(25).to_dict("records"),
        "has_data": bool(len(enrol) or len(results)),
    }


def _fig():
    fig, ax = plt.subplots(figsize=(5.6, 3.4), dpi=110)
    fig.patch.set_facecolor(IVORY)
    ax.set_facecolor(IVORY)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(GREY)
    ax.tick_params(colors=CHARCOAL, labelsize=8)
    return fig, ax


def _out(fig):
    buf = io.BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format="png", facecolor=IVORY)
    plt.close(fig)
    buf.seek(0)
    return buf


def _empty(msg):
    fig, ax = _fig()
    ax.text(0.5, 0.5, msg, ha="center", va="center", color=GREY, fontsize=10)
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    return _out(fig)


def chart(name, get_conn):
    conn = get_conn()
    enrol, results, prog, lessons, apps, users = _frames(conn)

    if name == "enrolments":
        if enrol.empty:
            return _empty("No enrolments yet")
        s = enrol.groupby("category").size().sort_values()
        fig, ax = _fig()
        ax.barh(list(s.index), list(s.values), color=NAVY, height=0.55)
        ax.set_xlabel("Learners", color=CHARCOAL, fontsize=9)
        ax.set_title("Enrolments by category", color=NAVY, fontsize=11, loc="left")
        return _out(fig)

    if name == "pass-rate":
        if results.empty:
            return _empty("No assessment attempts yet")
        passed = int(results["passed"].sum())
        failed = int(len(results) - passed)
        fig, ax = _fig()
        ax.pie([passed, failed] if failed else [passed],
               labels=["Passed", "Not passed"] if failed else ["Passed"],
               colors=[NAVY, GOLD], autopct="%1.0f%%",
               textprops={"color": CHARCOAL, "fontsize": 9},
               wedgeprops={"edgecolor": IVORY, "linewidth": 2})
        ax.set_title("Assessment pass rate", color=NAVY, fontsize=11, loc="left")
        return _out(fig)

    if name == "placements":
        if apps.empty:
            return _empty("No applications yet")
        d = apps.copy()
        d["month"] = pd.to_datetime(d["applied_at"], errors="coerce").dt.to_period("M").astype(str)
        s = d.groupby("month").size()
        fig, ax = _fig()
        ax.plot(list(s.index), list(s.values), color=NAVY, marker="o", markerfacecolor=GOLD, linewidth=2)
        ax.set_ylabel("Applications", color=CHARCOAL, fontsize=9)
        ax.set_title("Monthly placement activity", color=NAVY, fontsize=11, loc="left")
        return _out(fig)

    if name == "clusters":
        table = learner_table(conn)
        active = table[table["tier"] != "Unassessed"]
        if active.empty:
            return _empty("Not enough learner activity to cluster yet")
        fig, ax = _fig()
        for i, (tier, grp) in enumerate(active.groupby("tier")):
            ax.scatter(grp["quiz_score"], grp["completion"], label=tier,
                       color=SERIES[i % len(SERIES)], s=60, edgecolor=IVORY)
        ax.set_xlabel("Mean quiz score (%)", color=CHARCOAL, fontsize=9)
        ax.set_ylabel("Course completion (%)", color=CHARCOAL, fontsize=9)
        ax.set_title("K-Means learner skill tiers", color=NAVY, fontsize=11, loc="left")
        ax.legend(frameon=False, fontsize=8, labelcolor=CHARCOAL)
        return _out(fig)

    return None
