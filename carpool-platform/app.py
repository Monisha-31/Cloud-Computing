"""
Cloud-Based Carpool Coordination Platform
------------------------------------------
A Flask web application that connects drivers and riders travelling on
similar routes and at similar times.

Run locally:
    pip install -r requirements.txt
    python app.py

Run with Docker:
    docker build -t carpool-app .
    docker run -p 5000:5000 carpool-app
"""

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from datetime import datetime, timedelta
import sqlite3
import os

app = Flask(__name__)
app.secret_key = "carpool-secret-key"  # change in production
DB_PATH = os.path.join(os.path.dirname(__file__), "carpool.db")


# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS rides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_name TEXT NOT NULL,
            source TEXT NOT NULL,
            destination TEXT NOT NULL,
            travel_time TEXT NOT NULL,   -- ISO format datetime
            seats_available INTEGER NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ride_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rider_name TEXT NOT NULL,
            source TEXT NOT NULL,
            destination TEXT NOT NULL,
            travel_time TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Matching logic
# ---------------------------------------------------------------------------
def find_matches(source, destination, travel_time_str, time_window_minutes=30):
    """
    Match a rider's request against posted rides.
    A match happens when:
      - source and destination are the same (case-insensitive)
      - travel time is within +/- time_window_minutes
    """
    conn = get_db()
    rides = conn.execute(
        "SELECT * FROM rides WHERE LOWER(source)=? AND LOWER(destination)=? AND seats_available > 0",
        (source.lower().strip(), destination.lower().strip()),
    ).fetchall()
    conn.close()

    try:
        rider_time = datetime.fromisoformat(travel_time_str)
    except ValueError:
        return []

    matches = []
    for ride in rides:
        ride_time = datetime.fromisoformat(ride["travel_time"])
        diff = abs((ride_time - rider_time).total_seconds()) / 60
        if diff <= time_window_minutes:
            matches.append(
                {
                    "id": ride["id"],
                    "driver_name": ride["driver_name"],
                    "source": ride["source"],
                    "destination": ride["destination"],
                    "travel_time": ride["travel_time"],
                    "seats_available": ride["seats_available"],
                    "time_diff_minutes": round(diff, 1),
                }
            )

    # Closest departure time first
    matches.sort(key=lambda m: m["time_diff_minutes"])
    return matches


def get_place_suggestions():
    """
    Returns a sorted list of distinct place names seen so far (from both
    rides and ride_requests), used to auto-suggest Source/Destination
    values in the form fields.
    """
    conn = get_db()
    rows = conn.execute(
        "SELECT source AS place FROM rides UNION SELECT destination AS place FROM rides "
        "UNION SELECT source AS place FROM ride_requests UNION SELECT destination AS place FROM ride_requests"
    ).fetchall()
    conn.close()
    places = sorted({row["place"].strip() for row in rows if row["place"] and row["place"].strip()})
    return places


def get_ongoing_rides():
    """
    Rides that haven't departed yet (travel_time in the future) and still
    have seats available - shown to riders as 'currently ongoing rides'.
    """
    conn = get_db()
    rides = conn.execute(
        "SELECT * FROM rides WHERE seats_available > 0 ORDER BY travel_time ASC"
    ).fetchall()
    conn.close()
    now = datetime.now()
    upcoming = []
    for r in rides:
        try:
            if datetime.fromisoformat(r["travel_time"]) >= now:
                upcoming.append(r)
        except ValueError:
            continue
    return upcoming


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/driver", methods=["GET", "POST"])
def driver():
    if request.method == "POST":
        conn = get_db()
        conn.execute(
            "INSERT INTO rides (driver_name, source, destination, travel_time, seats_available, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                request.form["driver_name"],
                request.form["source"],
                request.form["destination"],
                request.form["travel_time"],
                int(request.form["seats_available"]),
                datetime.now().isoformat(),
            ),
        )
        conn.commit()
        conn.close()
        flash("Ride posted successfully!", "success")
        return redirect(url_for("driver"))

    conn = get_db()
    rides = conn.execute("SELECT * FROM rides ORDER BY travel_time ASC").fetchall()
    conn.close()
    return render_template("driver.html", rides=rides, places=get_place_suggestions())


@app.route("/driver/edit/<int:ride_id>", methods=["GET", "POST"])
def edit_ride(ride_id):
    conn = get_db()
    ride = conn.execute("SELECT * FROM rides WHERE id=?", (ride_id,)).fetchone()
    if not ride:
        conn.close()
        flash("Ride not found.", "error")
        return redirect(url_for("driver"))

    if request.method == "POST":
        conn.execute(
            "UPDATE rides SET driver_name=?, source=?, destination=?, travel_time=?, seats_available=? "
            "WHERE id=?",
            (
                request.form["driver_name"],
                request.form["source"],
                request.form["destination"],
                request.form["travel_time"],
                int(request.form["seats_available"]),
                ride_id,
            ),
        )
        conn.commit()
        conn.close()
        flash("Ride updated successfully!", "success")
        return redirect(url_for("driver"))

    conn.close()
    return render_template("edit_ride.html", ride=ride, places=get_place_suggestions())


@app.route("/driver/delete/<int:ride_id>", methods=["POST"])
def delete_ride(ride_id):
    conn = get_db()
    ride = conn.execute("SELECT * FROM rides WHERE id=?", (ride_id,)).fetchone()
    if ride:
        conn.execute("DELETE FROM rides WHERE id=?", (ride_id,))
        conn.commit()
        flash("Ride deleted.", "success")
    else:
        flash("Ride not found.", "error")
    conn.close()
    return redirect(url_for("driver"))


@app.route("/rider", methods=["GET", "POST"])
def rider():
    matches = None
    searched = False
    if request.method == "POST":
        searched = True
        matches = find_matches(
            request.form["source"],
            request.form["destination"],
            request.form["travel_time"],
        )
        if matches:
            conn = get_db()
            conn.execute(
                "INSERT INTO ride_requests (rider_name, source, destination, travel_time, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    request.form["rider_name"],
                    request.form["source"],
                    request.form["destination"],
                    request.form["travel_time"],
                    datetime.now().isoformat(),
                ),
            )
            conn.commit()
            conn.close()

    return render_template(
        "rider.html",
        matches=matches,
        searched=searched,
        ongoing_rides=get_ongoing_rides(),
        places=get_place_suggestions(),
    )


@app.route("/book/<int:ride_id>", methods=["POST"])
def book(ride_id):
    conn = get_db()
    ride = conn.execute("SELECT * FROM rides WHERE id=?", (ride_id,)).fetchone()
    if ride and ride["seats_available"] > 0:
        conn.execute(
            "UPDATE rides SET seats_available = seats_available - 1 WHERE id=?", (ride_id,)
        )
        conn.commit()
        flash(f"Seat booked with {ride['driver_name']}!", "success")
    else:
        flash("Sorry, no seats available.", "error")
    conn.close()
    return redirect(url_for("rider"))


# ---------------------------------------------------------------------------
# Simple JSON API (useful for AWS/API demos and for the CloudSim-style
# performance simulation to hit as a real endpoint)
# ---------------------------------------------------------------------------
@app.route("/api/match", methods=["POST"])
def api_match():
    data = request.get_json(force=True)
    matches = find_matches(
        data.get("source", ""), data.get("destination", ""), data.get("travel_time", "")
    )
    return jsonify({"count": len(matches), "matches": matches})


@app.route("/health")
def health():
    """Health check endpoint - useful for Docker/AWS load balancer checks."""
    return jsonify({"status": "ok", "time": datetime.now().isoformat()})


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
