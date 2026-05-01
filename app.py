import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.environ.get("CLOUD_NAME"),
    api_key=os.environ.get("API_KEY"),
    api_secret=os.environ.get("API_SECRET")
)

from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from flask import Flask, render_template, request, redirect, session, flash, jsonify, make_response

# ================== PATH SETUP ==================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = "users.db"

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

    # ✅ Add column ONLY if not exists (SAFE)
    try:
        cursor.execute("ALTER TABLE profiles ADD COLUMN fit_type TEXT DEFAULT 'cover'")
    except:
        pass

    conn.commit()
    conn.close()
create_profile_table()

def create_posts_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS posts(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        image_url TEXT,
        public_id TEXT,
        caption TEXT
    )
    """)

    # ✅ Safe add column
    try:
        cursor.execute("ALTER TABLE posts ADD COLUMN fit_type TEXT DEFAULT 'cover'")
    except:
        pass

    conn.commit()
    conn.close()
create_posts_table()

#creating likes table
def create_likes_table():
	conn = sqlite3.connect(DB_PATH)
	cursor = conn.cursor()
	
	cursor.execute("""
	CREATE TABLE IF NOT EXISTS likes(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER,
	post_id INTEGER
	)
	""")
	conn.commit()
	conn.close()
create_likes_table()

#create comments table
def create_comments_table():
	conn = sqlite3.connect(DB_PATH)
	cursor = conn.cursor()
	
	cursor.execute("""
	CREATE TABLE IF NOT EXISTS comments(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER,
	post_id INTEGER,
	text TEXT
	)
	""")
	conn.commit()
	conn.close()
create_comments_table()

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

@app.after_request
def no_cache(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route("/")
def welcome():
    if "user" in session:
    	return redirect("/dashboard")
    	
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
        return render_template("signup.html", old=request.form)

    if not username:
        flash("Please create a valid username!", "error")
        return render_template("signup.html", old=request.form)

    if len(password) < 6:
        flash("Password must be at least 6 characters!", "error")
        return render_template("signup.html", old=request.form)

    if password != confirm_password:
        flash("Passwords do not match!", "error")
        return render_template("signup.html", old=request.form)

    hashed_password = generate_password_hash(password)
    result = add_user(email, username, hashed_password)

    if result == "success":
        with sqlite3.connect(DB_PATH) as conn:
        	cursor = conn.cursor()
        	
        	cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
        	user = cursor.fetchone()
        
        session["user"] = username
        session["user_id"] = user[0]
        
        return redirect("/dashboard")

    flash("Username already exists!", "error")
    return render_template("signup.html", old=request.form)

@app.route("/login-page")
def loginpage():
    if "user" in session:
    	return redirect("/dashboard")
    	
    return render_template("login.html")

@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")

    if not username or not password:
        flash("Please enter username and password!", "error")
        return redirect("/login-page")

    if validate_user(username, password):
        with sqlite3.connect(DB_PATH) as conn:
        	cursor = conn.cursor()
        	
        	cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
        	user = cursor.fetchone()
        	
        session["user"] = username
        session["user_id"] = user[0]
        
        return redirect("/dashboard")

    flash("Invalid login credentials!", "error")
    return redirect("/login-page")

@app.route("/check-session")
def check_session():
	if "user" in session:
		return jsonify({"logged_in": True})
	return jsonify({"logged_in": False})

@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect("/login-page")

    return render_template("dashboard.html", username=session["user"])

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect("/login-page")

@app.route("/profile")
def profile():
    if "user" not in session:
        return redirect("/login-page")

    username = session["user"]

    #getting user_id
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username=?", (username,))
        user = cursor.fetchone()

    user_id = user[0]
    
    #getting profile
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM profiles WHERE user_id=?", (user_id,))
        profile = cursor.fetchone()
    
    #getting posts
    with sqlite3.connect(DB_PATH) as conn:
    	cursor = conn.cursor()
    	cursor.execute("""
    	SELECT * FROM posts
    	WHERE user_id=?
    	ORDER BY id DESC
    	""", (user_id, ))
    	posts = cursor.fetchall()
    post_count = len(posts)

    return render_template("profile.html", profile=profile, posts=posts, post_count=post_count)

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
    fit_type = request.form.get("fit_type", "cover")
    
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
            
        if existing and existing[7]:
        	cloudinary.uploader.destroy(existing[7])
        	
        result = cloudinary.uploader.upload(file)
        image_url = result["secure_url"]
        public_id = result["public_id"]

    with sqlite3.connect(DB_PATH) as conn:
    	cursor = conn.cursor()
    	
    	if existing:
    	    name = name if name else existing[2]
    	    bio = bio if bio else existing[3]
    	    links = links if links else existing[4]
    	    shape = shape if shape else existing[6]
    	    profile_pic = image_url if image_url else existing[5]
    	    final_public_id = public_id if image_url else existing[7]
    	    fit_type = fit_type if fit_type else existing[8]
    	    
    	    cursor.execute("""
    	    UPDATE profiles
    	    SET name=?, bio=?, links=?, profile_pic=?, shape=?, public_id=?, fit_type=?
    	    WHERE user_id=?
    	    """, (name, bio, links, profile_pic, shape, final_public_id, fit_type, user_id))
    	else:
    	       profile_pic = image_url if image_url else "/static/default.png"
    	       
    	       cursor.execute("""
    	       INSERT INTO profiles(user_id, name, bio, links, profile_pic, shape, public_id, fit_type)
    	       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    	       """, (user_id, name, bio, links, profile_pic, shape, public_id, fit_type))
    	       
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

@app.route("/create-post")
def create_post_page():
	if "user" not in session:
		return redirect("/login-page")		
	return render_template("create_post.html")

@app.route("/create-post", methods=["POST"])
def create_post():
	if "user" not in session:
		return redirect("/login-page")
	
	username = session["user"]
	caption = request.form.get("caption")
	file = request.files.get("image")
	fit_type = request.form.get("fit_type", "cover")
	
	if not file or file.filename == "":
		return "No file uploaded!"
	
	#get user_id
	with sqlite3.connect(DB_PATH) as conn:
		cursor = conn.cursor()
		cursor.execute("SELECT id FROM users WHERE username=?", (username,))
		user = cursor.fetchone()
		
	user_id = user[0]
	
	#uploading to cloudinary
	result = cloudinary.uploader.upload(file)
	image_url = result["secure_url"]
	public_id = result["public_id"]
	
	#save to DB
	with sqlite3.connect(DB_PATH) as conn:
		cursor = conn.cursor()
		cursor.execute("""
		INSERT INTO posts(user_id, image_url, public_id, caption, fit_type)
		VALUES(?, ?, ?, ?, ?)
		""", (user_id, image_url, public_id, caption, fit_type ))
		conn.commit()
		
	return redirect("/profile")	

@app.route("/post/<int:post_id>")
def view_post(post_id):
	if "user" not in session:
		return redirect("/login-page")
		
	username = session["user"]
	
	with sqlite3.connect(DB_PATH) as conn:
		cursor = conn.cursor()
		
		#getting user_id
		cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
		user = cursor.fetchone()
		user_id = user[0]
		
		#getting all posts
		cursor.execute("""
		SELECT posts.*, users.username,
		EXISTS(
		SELECT 1 FROM likes
		WHERE likes.post_id = posts.id AND likes.user_id=?
		) as liked_by_user,
		(SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
		(SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count
		FROM posts
		JOIN users ON posts.user_id = users.id
		WHERE posts.user_id = ?
		ORDER BY posts.id DESC
		""", (user_id, user_id))
		
		posts = cursor.fetchall()
	
	return render_template("view_post.html", posts=posts, current_id=post_id, user_id=user_id)

@app.route("/delete-post/<int:post_id>", methods=["POST"])
def delete_post(post_id):
	if "user" not in session:
		return redirect("/login-page")
		
	username = session["user"]
	
	with sqlite3.connect(DB_PATH) as conn:
		cursor = conn.cursor()
		
		#getting user_id
		cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
		user = cursor.fetchone()
		user_id = user[0]
		
		#getting post
		cursor.execute("SELECT * FROM posts WHERE id=?", (post_id, ))
		post = cursor.fetchone()
		
		if not post:
			return "Post not found!"
			
		#checking ownership
		if post[1] != user_id:
			return "Unauthorized!"
			
		#delete from cloudinary
		try:
		     cloudinary.uploader.destroy(post[3])
		except Exception as e:
			 print("Cloudinary delete failed:", e)
		
		#delete from DB(SQLite3)
		cursor.execute("DELETE FROM posts WHERE id=?", (post_id, ))
		conn.commit()
		
	return redirect("/profile")
	
@app.route("/feed")
def feed():
	if "user" not in session:
		return redirect("/login-page")
	
	username = session["user"]
	
	with sqlite3.connect(DB_PATH) as conn:
		cursor = conn.cursor()
		
		#getting user_id
		cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
		user = cursor.fetchone()
		user_id = user[0]
		
		cursor.execute("""
		SELECT posts.*, users.username,
		EXISTS(
		SELECT 1 FROM likes
		WHERE likes.post_id = posts.id AND likes.user_id=?
		) as liked_by_user,
		(SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
		(SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) as comment_count
		FROM posts
		JOIN users ON posts.user_id = users.id
		ORDER BY posts.id DESC
		""", (user_id, ))
		posts = cursor.fetchall()
	
	return render_template("feed.html", posts=posts, user_id=user_id)

@app.route("/like/<int:post_id>", methods=["POST"])
def like_post(post_id):
	if "user" not in session:
		return jsonify({"error": "login required"}), 403
	
	username = session["user"]
	
	with sqlite3.connect(DB_PATH) as conn:
		cursor = conn.cursor()
		
		#getting user_id
		cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
		user = cursor.fetchone()
		user_id = user[0]
		
		#check already liked
		cursor.execute("SELECT * FROM likes WHERE user_id=? AND post_id=?", (user_id, post_id))
		existing = cursor.fetchone()
		
		if existing:
			#unlike
			cursor.execute("DELETE FROM likes WHERE user_id=? AND post_id=?", (user_id, post_id))
			liked = False
		else:
			#like
			cursor.execute("INSERT INTO likes(user_id, post_id) VALUES(?, ?)", (user_id, post_id))
			liked = True
		conn.commit()
		
		#get updated count
		cursor.execute("SELECT COUNT(*) FROM likes WHERE post_id=?", (post_id, ))
		count = cursor.fetchone()[0]
		
	return jsonify({"liked": liked , "likes": count})

@app.route("/comments/<int:post_id>")
def get_comments(post_id):
	if "user" not in session:
		return jsonify({"error": "login required"}), 403
	with sqlite3.connect(DB_PATH) as conn:
		cursor = conn.cursor()
		
		cursor.execute("""
		SELECT comments.id, comments.text, users.username, comments.user_id
		FROM comments
		JOIN users ON comments.user_id = users.id
		WHERE comments.post_id = ?
		ORDER BY comments.id DESC
		""", (post_id, ))
		
		comments = cursor.fetchall()
	
	return jsonify(comments)

@app.route("/add-comment/<int:post_id>", methods=["POST"])
def add_comment(post_id):
	if "user" not in session:
		return jsonify({"error": "login required"}), 403
		
	username = session["user"]
	text = request.json.get("text")
	
	if not text:
		return jsonify({"error": "empty"}), 400
	
	with sqlite3.connect(DB_PATH) as conn:
		cursor = conn.cursor()
		
		#getting user_id
		cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
		user = cursor.fetchone()
		user_id = user[0]
		
		#Inserting comments
		cursor.execute("""
		INSERT INTO comments(user_id, post_id, text)
		VALUES(?, ?, ?)
		""", (user_id, post_id, text))
		
		comment_id = cursor.lastrowid
		
		conn.commit()
		
	return jsonify({"success": True, "username": username, "text": text, "comment_id": comment_id, "user_id": user_id})
	
@app.route("/delete-comment/<int:comment_id>", methods=["POST"])
def delete_comment(comment_id):
	if "user" not in session:
		return jsonify({"error": "login required"}), 403
		
	username = session["user"]
	
	with sqlite3.connect(DB_PATH) as conn:
		cursor = conn.cursor()
		
		#getting user_id
		cursor.execute("SELECT id FROM users WHERE username=?", (username, ))
		user = cursor.fetchone()
		user_id = user[0]
		
		
		#getting commet
		cursor.execute("SELECT user_id FROM comments WHERE id=?", (comment_id, ))
		comment = cursor.fetchone()
		
		if not comment:
			return jsonify({"error": "not found"}), 404
			
		if comment[0] != user_id:
			return jsonify({"error": "unauthorized"}), 403
			
		cursor.execute("DELETE FROM comments WHERE id=?", (comment_id, ))
		conn.commit()
		
	return jsonify({"success": True})


# ================== RUN ==================
port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port)
