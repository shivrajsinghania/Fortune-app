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
	links TEXT
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

#Validating user for login
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
	return render_template("Fortune[welcome].html")

@app.route("/signup")
def signup():
	return render_template("Fortune[signup].html")

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
	return render_template("Fortune[login].html")

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
		return render_template("Fortune[dashboard].html", username=session["user"])
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
	
	return render_template("Fortune[profile].html", profile=profile)

@app.route("/profile/update", methods=["POST"])
def update_profile():
	if "user" not in session:
		return redirect("/login-page")
		
	username = session["user"]
	
	name = request.form.get("name")
	bio = request.form.get("bio")
	links = request.form.get("links")
	
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
			cursor.execute("UPDATE profiles SET name=?, bio=?, links=? WHERE user_id=?", (name, bio, links, user_id))
		else:
			cursor.execute("INSERT INTO profiles(user_id, name, bio, links) VALUES(?, ?, ?, ?)", (user_id, name, bio, links))
		conn.commit()
	return redirect("/profile")
		

app.run(debug=True, use_reloader = False)