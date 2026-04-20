from werkzeug.utils import secure_filename
import os
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from flask import Flask, render_template
from flask import request
from flask import redirect
from flask import session

#creating table
def create_table():
	conn = sqlite3.connect("users.db")
	cursor = conn.cursor()
	
	cursor.execute("""
	CREATE TABLE IF NOT EXISTS users(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT UNIQUE,
	password TEXT
	)
	""")
	conn.commit()
	conn.close()
create_table()

#creating profile table
def create_profile_table():
	conn = sqlite3.connect("users.db")
	cursor = conn.cursor()
	
	cursor.execute("""
	CREATE TABLE IF NOT EXISTS profiles(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER UNIQUE,
	name TEXT,
	bio TEXT,
	links TEXT,
	profile_pic TEXT,
	shape TEXT
	)
	""")
	conn.commit()
	conn.close()
create_profile_table()

#adding user for signup
def add_user(username, hashed_password):
	try:
		with sqlite3.connect("users.db", timeout=10) as conn:
			cursor = conn.cursor()
			cursor.execute("INSERT INTO users(username, password) VALUES(?, ?)", (username, hashed_password) )
			conn.commit()
		return "success"
	except sqlite3.IntegrityError:
		return "Username already exists"

#Validating user for login-
def validate_user(username, password):
	
		with sqlite3.connect("users.db", timeout=10) as conn:
			cursor = conn.cursor()
			
			cursor.execute("SELECT * FROM users WHERE username=?", (username, ))
			
			user = cursor.fetchone()
			
			if user:
				stored_hash = user[2]     #password column
				return check_password_hash(stored_hash, password)
			else:
				return False

app = Flask(__name__)

app.secret_key = "mysecretkey"

@app.route("/")
def welcome():
	return render_template("welcome.html")

@app.route("/signup")
def signup():
	return render_template("signup.html")

@app.route("/submit", methods=["post"])
def submit():
	username = request.form.get("username")
	password = request.form.get("password")
	
	if not username or not password:
		return "Invalid input"
	
	hashed_password = generate_password_hash(password)
	
	result = add_user(username, hashed_password)
	
	if result == "success":
		session["user"] = username
		return redirect("/dashboard")
	else:
		return result

@app.route("/login-page")
def loginpage():
	return render_template("login.html")

@app.route("/login", methods=["POST"])
def login():
	username = request.form.get("username")
	password = request.form.get("password")
	
	if not username or not password:
		return "Invalid Input"
		
	if validate_user(username, password):
		session["user"] = username
		return redirect("/dashboard")
	else:
		return "Invalid Login Credential"

@app.route("/dashboard")
def dashboard():
	if "user" in session:
		return render_template("dashboard.html", username=session["user"])
	else:
		return redirect("/login-page")

@app.route("/logout" , methods=["POST"])
def logout():
	session.pop("user", None)
	return redirect("/")

@app.route("/profile")
def profile():
	if "user" not in session:
		return redirect("/login-page")
		
	username = session["user"]
	
	#get user_id
	with sqlite3.connect("users.db") as conn:
		cursor = conn.cursor()
		cursor.execute("SELECT id FROM users WHERE username=?", (username,))
		user = cursor.fetchone()
		
	user_id = user[0]
	
	#geting profile
	with sqlite3.connect("users.db") as conn:
		cursor = conn.cursor()
		cursor.execute("SELECT * FROM profiles WHERE user_id=?", (user_id, ))
		profile = cursor.fetchone()
	
	return render_template("profile.html", profile=profile)

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
	
	filename = None
	UPLOAD_FOLDER = "static/uploads"
	os.makedirs(UPLOAD_FOLDER, exist_ok=True)
	
	if file and file.filename != "":
		filename = secure_filename(file.filename)
		
		ALLOWED = {"jpg", "png", "jpeg"}
		ext = filename.split(".")[-1].lower()
		
		if ext not in ALLOWED:
			return "Invalid file type"
			
		file.save(os.path.join(UPLOAD_FOLDER, filename))
	
	#getting user_id
	with sqlite3.connect("users.db") as conn:
		cursor = conn.cursor()
		cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
		user = cursor.fetchone()
	
	user_id = user[0]
	
	with sqlite3.connect("users.db") as conn:
		cursor = conn.cursor()
		
		#checking if profile exists
		cursor.execute("SELECT * FROM profiles WHERE user_id=?", (user_id, ))
		existing = cursor.fetchone()
		
		if existing:
			if filename:
				cursor.execute("""
				UPDATE profiles 
				SET name=?, bio=?, links=?, profile_pic=?, shape=? WHERE user_id=? 
				""", (name, bio, links, filename, shape, user_id))
			else:
				cursor.execute("""
				UPDATE profiles
				SET name=?, bio=?, links=?, shape=? WHERE user_id=?
				""", (name, bio, links, shape, user_id))
				
		else:
			cursor.execute("""
			INSERT INTO profiles(user_id, name, bio, links, profile_pic, shape)
			VALUES (?, ?, ?, ?, ?, ?)
			""", (user_id, name, bio, links, filename, shape))
		conn.commit()
		return redirect("/profile")

@app.route("/profile/edit")
def edit_profile():
	if "user" not in session:
		return redirect("/login-page")
		
	username = session["user"]
	
	#get user id
	with sqlite3.connect("users.db") as conn:
		cursor = conn.cursor()
		cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
		user = cursor.fetchone()
	if not user:
		return "user is not in database"
	user_id = user[0]
	
	#get profile
	with sqlite3.connect("users.db") as conn:
		cursor = conn.cursor()
		cursor.execute("SELECT * FROM profiles WHERE user_id=?", (user_id, ))
		profile = cursor.fetchone()
	
	return render_template("edit_profile.html", profile=profile)
	
port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port)
