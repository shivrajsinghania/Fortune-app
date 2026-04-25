import os
import cloudinary
import cloudinary.uploader

if os.environ.get("CLOUD_NAME"):
    cloudinary.config(
        cloud_name=os.environ.get("CLOUD_NAME"),
        api_key=os.environ.get("API_KEY"),
        api_secret=os.environ.get("API_SECRET")
    )
else:
    print("⚠️ Cloudinary ENV NOT FOUND")

from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from flask import Flask, render_template, request, redirect, session, flash

# ================== PATH SETUP ==================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(BASE_DIR, "users.db")

# ================== DATABASE ==================
def create_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        username TEXT UNIQUE,
        password TEXT
    )
    """)
    conn.commit()
    conn.close()

create_table()

def create_profile_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profiles(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        name TEXT,
        bio TEXT,
        links TEXT,
        profile_pic TEXT,
        shape TEXT,
        public_id TEXT
    )
    """)
    conn.commit()
    conn.close()

create_profile_table()

def add_user(email, username, hashed_password):
    try:
        with sqlite3.connect(DB_PATH, timeout=10) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users(email, username, password) VALUES(?, ?, ?)",
                (email, username, hashed_password)
            )
            conn.commit()
        return "success"
    except sqlite3.IntegrityError:
        return "exists"

def validate_user(username, password):
    with sqlite3.connect(DB_PATH, timeout=10) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username=?", (username,))
        user = cursor.fetchone()

        if user:
            stored_hash = user[3]
            return check_password_hash(stored_hash, password)
        return False

# ================== APP ==================
app = Flask(__name__)
app.secret_key = "mysecretkey"

@app.route("/")
def welcome():
    return render_template("welcome.html")

@app.route("/signup")
def signup():
    return render_template("signup.html")

@app.route("/submit", methods=["POST"])
def submit():
    email = request.form.get("email")
    username = request.form.get("username")
    password = request.form.get("password")
    confirm_password = request.form.get("confirm_password")

    if not email or "@" not in email:
        flash("Please enter a valid email!", "error")
        return redirect("/signup")

    if not username:
        flash("Please create a valid username!", "error")
        return redirect("/signup")

    if len(password) < 6:
        flash("Password must be at least 6 characters!", "error")
        return redirect("/signup")

    if password != confirm_password:
        flash("Passwords do not match!", "error")
        return redirect("/signup")

    hashed_password = generate_password_hash(password)
    result = add_user(email, username, hashed_password)

    if result == "success":
        session["user"] = username
        return redirect("/dashboard")

    flash("Username already exists!", "error")
    return redirect("/signup")

@app.route("/login-page")
def loginpage():
    return render_template("login.html")

@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")

    if not username or not password:
        flash("Please enter username and password!", "error")
        return redirect("/login-page")

    if validate_user(username, password):
        session["user"] = username
        return redirect("/dashboard")

    flash("Invalid login credentials!", "error")
    return redirect("/login-page")

@app.route("/dashboard")
def dashboard():
    if "user" in session:
        return render_template("dashboard.html", username=session["user"])
    return redirect("/login-page")

@app.route("/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    return redirect("/")

@app.route("/profile")
def profile():
    if "user" not in session:
        return redirect("/login-page")

    username = session["user"]

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username=?", (username,))
        user = cursor.fetchone()

    user_id = user[0]

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM profiles WHERE user_id=?", (user_id,))
        profile = cursor.fetchone()

    return render_template("profile.html", profile=profile)

# ================== UPDATE PROFILE ==================
@app.route("/profile/update", methods=["POST"])
def update_profile():
    if "user" not in session:
        return redirect("/login-page")

    username = session["user"]

    name = request.form.get("name")
    bio = request.form.get("bio")
    links = request.form.get("links")
    shape = request.form.get("shape")
    file = request.files.get("profile_pic")
    
    image_url = None
    public_id = None
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username=?", (username,))
        user = cursor.fetchone()

    user_id = user[0]

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM profiles WHERE user_id=?", (user_id,))
        existing = cursor.fetchone()

    if file and file.filename != "":
        filename = secure_filename(file.filename)

        allowed = {"jpg", "jpeg", "png"}
        ext = filename.split(".")[-1].lower()

        if ext not in allowed:
            return "Invalid file type"
            
        try:
            if existing and existing[7]:
                cloudinary.uploader.destroy(existing[7])
        except Exception as e:
            print("Delete error:", e)
        	
        try:
            result = cloudinary.uploader.upload(
                file,
                upload_preset="my_preset"
            )
            image_url = result["secure_url"]
            public_id = result["public_id"]
        except Exception as e:
            print("Upload Error:", e)
            return "Upload failed"
            
    with sqlite3.connect(DB_PATH) as conn:
    	cursor = conn.cursor()
    	
    	if existing:
    	    name = name if name else existing[2]
    	    bio = bio if bio else existing[3]
    	    links = links if links else existing[4]
    	    shape = shape if shape else existing[6]
    	    profile_pic = image_url if image_url else existing[5]
    	    final_public_id = public_id if image_url else existing[7]
    	    
    	    cursor.execute("""
    	    UPDATE profiles
    	    SET name=?, bio=?, links=?, profile_pic=?, shape=?, public_id=?
    	    WHERE user_id=?
    	    """, (name, bio, links, profile_pic, shape, final_public_id, user_id))
    	else:
    	       profile_pic = image_url if image_url else "/static/default.png"
    	       
    	       cursor.execute("""
    	       INSERT INTO profiles(user_id, name, bio, links, profile_pic, shape, public_id)
    	       VALUES (?, ?, ?, ?, ?, ?, ?)
    	       """, (user_id, name, bio, links, profile_pic, shape, public_id))
    	       
    	conn.commit()
    	
    return redirect("/profile")

@app.route("/profile/edit")
def edit_profile():
    if "user" not in session:
        return redirect("/login-page")

    username = session["user"]

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username=?", (username,))
        user = cursor.fetchone()

    if not user:
        return "User not found"

    user_id = user[0]

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM profiles WHERE user_id=?", (user_id,))
        profile = cursor.fetchone()

    return render_template("edit_profile.html", profile=profile)

# ================== RUN ==================
port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port)
