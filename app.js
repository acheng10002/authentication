/* building a minimal express app
- allows users to sign up, log in, and log out
- everything will be in one file except for the views

passport.js - middleware that handles authentication and sessions
middleware - intermediary code that handles requests and responses 
             runs before or after are sent to route handlers 
             modifies requests
             handles errors
             functions that take req and res objects, manipulate them, and pass them on
Understand the use order for the required middleware for Passport.js
Describe what Passport.js Strategies are
- Passport.js Strategies - middlewares that connect into Passport.js middleware to
                           implement logic for authenticating users 
Use the LocalStrategy to authenticate users
- Which passport.js strategy did I use in the lesson?
- LocalStrategy - most basic and common username-and-password way to authenticate users
Review prior learning material (routes, templates, middleware, async/await, and promises
Use Passport.js to set up user authentication with Express */
// import local modules
const path = require("node:path");
const { Pool } = require("pg");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
/* using bcryptjs module where I save my passwords to the DB and where I compare them 
inside the LocalStrategy */
const bcrypt = require("bcryptjs");

/* pool - manages multiple database connections, automatically reusing them for efficiency
          used for web apps, API servers including Express.js, performance-critical apps */
const pool = new Pool({
  host: "localhost",
  user: "amycheng",
  database: "authentication",
  password: "q",
  port: 5432,
});

// instantiates an Express app
const app = express();

/* app.set - configures app settings
             it stores config settings
defining the views property, telling Express where to find views 
joins multiple path segments into a single normalized path */
app.set("views", path.join(__dirname, "views"));
/* defines view engine app property, telling Express which templating engine to use 
view engine - templating engine that allows me to render dynamic HTML pases using
              JS and data from my backend */
app.set("view engine", "ejs");

/* function 1 of 3: set up the LocalStrategy 
- will get called when I use passport.authenticate() */
passport.use(
  new LocalStrategy(async (username, password, done) => {
    // takes a username and password and tries to find the user in my DB
    try {
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );
      const user = rows[0];

      if (!user) {
        /* done - like a middleware function that will be called 
                  it signals when an authentication process has completed or not
                  passes the authenticated user or an error to Passport */
        return done(null, false, { message: "Incorrect username" });
      }
      const match = await bcrypt.compare(password, user.password);
      // makes sure the user's password matches the given password
      // if (user.password !== password) {
      if (!match) {
        return done(null, false, { message: "Incorrect password" });
      }
      /* if there's a user in the DB, the passwords match, then it authenticates 
      the user and moves on */
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

/* passport internally calls a function from express-session that uses some data
- connect.sid - session cookie set by express-session, using some data, and stores
                the session ID in the client's browser
                it's sent to the client
- next two functions define what bit of info passport is looking for when the server
creates and then decodes the cookie that gets sent to the browser
function 2 of 3: sessions 
- passport.serializeUser - takes a callback which contains the info I wish to 
                           store in the session data 
it receives the user object found from a successful login, stores the user object's
id property in the session data */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/* function 3 of 3: serialization 
- passport.deserialieUser - called when retrieving a session
                            it extracts the data I serialized in it 
                            then attaches something to the .user property of request 
                            for use in the rest of the request 
if it finds a matching session for that request, it retrieves the id I stored in the 
session data */
passport.deserializeUser(async (id, done) => {
  try {
    // use that id to query my database for the specified user
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    const user = rows[0];
    /* attaches the specified user object to req.user 
    rest of request has access to that user object via req.user */
    done(null, user);
  } catch (err) {
    done(err);
  }
});

/* passport.serializeUser and passport.deserializeUser get used in the background 
by passport
middleware that enables session support using express-session 
secret - secret key used to sign the session cookie, prevents tampering
resave - prevents saving the session to the store on every request if nothing changed
saveUninitialized - prevents storing empty sessions, session is only saved if modified 
1. user visits the site, server generates a unique session ID
2. the server stores session data
3. the session ID is sent to the browser as a connect.sid cookie
4. on the next reuqest, the browser sends back connect.sid, allowing the server to
   retrieve the session/read or decodes the cookie from the request */
app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));

// integrates Passport.js with sessions, allowing user authentication to persist across multiple requests
app.use(passport.session());

/* middleware that must be placed before route handler
parses URL-encoded form data from an incoming request (extracts form values)
into req.body, uses querystring library which cannot handle nested objects */
app.use(express.urlencoded({ extended: false }));

/* router handlers define API endpoints
route handler - defines an API endpint 
                specifies how the server processes requests and sends responses
                has HTTP method
                has URL path
                has callback function that handles the request and response
create API routes below */

// custom middleware that simplifies how I access currenUser in my views
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

/* - on each HTTP request that a user calls onto my Express server, Passport will use a 
     Strategy to determine whether the requestor has permission to view that resource 
- if the user is authenticated, they're allowed onto the Express route
- each Strategy uses the Passport JS framework, they're just plugged in 
- Passport Local Strategy uses Cookies, Express Sessions, and some authentication logic */

// app.get("/", (req, res) => res.render("index", { user: req.user }));
app.get("/", (req, res) => res.render("index"));

/* route handler that renders index view at root path 
check for req.user to change my views depending on wether or not a user is logged in
the passport middleware checks to see if a user is logged in by checking the cookies
that come in with the req object
if the req object has a cookie, passport adds the user to the req object
now route handler sends the user object as part of the locals object to my view */
app.get("/", (req, res) => res.render("index", { user: req.user }));

// route handler that renders sign-up form
app.get("/sign-up", (req, res) => res.render("sign-up-form"));

// route handler that posts new users to my database
/* password hashes - result of passing user's password through a one-way hash function
                     which maps variabled sized inputs to fixed size pseudo-random outputs */
app.post("/sign-up", async (req, res, next) => {
  try {
    /* bcrypt.hash function, 2nd argument is length of "salt"
    salting - adding extra random characters to a password 
              password and the salt are then fed into the hashing function 
              salt gets stored in the database alongside the hashed value
    salting prevents against rainbow tables and dictionary attacks
    rainbow tables - precomputed table of hashed passwords used to quickly crack password
                     hashes by reversing them into their original plaintext values 
    dictionary attacks - when an attacker tries common words, phrases, and previously 
                         leaked passwords */
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    /* remember query parameterization prevents SQL injections 
    it separates SQL logic from user input, ensures user data is treated as data */
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
      req.body.username,
      hashedPassword,
    ]);
    res.redirect("/");
  } catch (err) {
    return next(err);
  }
});

/* passport.authenticate - middleware that
1. looks at request body for parameters named username and password and runs 
   LocalStrategy function to see if they are in the database 
2. creates a session cookie that gets stored in the user's browser 
   this session cookie is used in all future requests to see whether or not
   the user is logged in 
3. redirects you to different routes based on whether the login succeeded or failed */
app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failtureRedirect: "/",
  })
);

// passport middleware adds a logout function to the req object
app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});
/* Explain the purpose of cookies in authentication
- Why does passport.js create a cookie? 
The cookie is set by express-session, and it stores the session ID in the client's browser 
the cookie allows the server to recognize returning users */

// listens at port 3000 for incoming requests
app.listen(3000, () => console.log("app listening on port 3000!"));

/* Describe what bcrypt is and its use
- Why should I include bcrypt when I begin a project?
Describe what a hash is and explain the importance of password hashing
Describe bcrypt's compare function 
- What does the bcrypt.compare() function do? */
