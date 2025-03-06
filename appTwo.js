/* how the session works in the Express app 
how the cookie works with the session
configuration that has to be done to set up Express session middleware */
const express = require("express");
const session = require("express-session");
// PostgreSQL driver for Node.js
const pg = require("pg");
// session store for PostgreSQL
const pgSession = require("connect-pg-simple")(session);

/* 1. Express connects to PostgreSQL using a connection pool, allows app to 
interact with the database
database connection configuration, it's on localhost 
when the app gets run, the sessions table gets initialized */
const pool = new pg.Pool({
  user: "amycheng",
  host: "localhost",
  database: "tutorial_db",
  password: "q",
  port: 5432,
});

const app = express();
/*
// session store
const MongoStore = require("connect-mongo")(session);

const dbString = "mongodb://localhost:27017/tutorial_db";
const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// database connection
const connection = mongoose.createConnection(dbString, dbOptions);
*/

// Express middlewares that allow Express server to parse different request types
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* 2. uses connect-pg-simple to store sessions in PostgreSQL
saves sessions in the sessions table
session store using PostgreSQL 
automatically retrieves session data when a user makes a request 
3. each user gets a unique session id, stored in the sessions table
- session id (sid) is stored for each user
- session  data (sess) contains user-specific information
- expiration time (expire) determines when the session expires 

session - has its user data stored on the server-side, on the Express app in this case
          Express session will store larger amounts of data
          authenticating into the session with a secret key
cookie - has its user data stored in the browser 
         browser attaches that cookie key value pair to every HTTP request it takes 
         user credentials or secret info cannot be stored in a cookie 
         
All I have to do to establish a new session, is to make a HTTP request to my app:
- go to the localhost url
- session middleware will fire  
- session get created: 
  session id gets created
  session id gets stored in a cookie in the browser

app.use - using the session middleware, and passing in options object */
app.use(
  session({
    /* deciding what persistent memory will my sessions be stored in 
    by default, express session will use local memory 
    I need to connect my database to the express session middleware 
    tells express session middleware that I want to use the tutorial_db PostgreSQL 
    database for its session store 
    package - collection of 1 or more modules packaged together and published to npm
    module - single JS file that exports functions, variables, or classes so they can
             be reused in other files 
    uses connect-pg-simple package */
    store: new pgSession({
      // connection pool to PostgreSQL, instantiated above
      pool,
      // uses the sessions table
      tableName: "sessions",
    }),
    /* secret should be stored in a env variable 
    if the secret is invalid, then the session is invalid too */
    secret: "some secret",
    // resave and saveUnitialized tells middleware how to react to browser events
    resave: false,
    saveUninitialized: true,
    /* cookie can have an expires property 
    at a certain time, browser will delete the cookie, and the cookie won't be 
    attached to any of the requests in the future 
    */
    cookie: {
      // 1 day
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);
/*
const sessionStore = new MongoStore({
  mongooseConnection: connection,
  collection: "sessions",
});

app.use(
  session({
    secret: "some secret",
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);
*/

/* 4. sessions are automatically retrieved and validated on requests 
- when a request is made, Express checks the session store
- if a valid session exists, req.session is populated
- if no session exists, a new session is created
- if a user logs in, I can attach data to the session object 
  session data will load on every request
  
1. a HTTP get request gets sent to the one route 
2. session middleware initializes a session 
3. session middleware will set a cookie equal to the session id 
4. cookie gets put in the set cookie property of the HTTP response header
5. browser receives the set cookie property and will set the cookie
   cookie is called connect.sid in the express session middleware
6. any time under then refreshes the browser, that cookie will be part of the GET request 
   in the request header
7. session middleware will get the cookie on every request
8. session middleware on the server takes the value of the cookie and look up the session 
   id in the session store/database
9. session middleware will determine if the session is valid 
   if valid, use the data from the session to authenticate the user, find data about the 
   user, etc.
   if not valid, creates a new session
   tomorrow, the cookie will be deleted from the browser */
// just one simple route
app.get("/", (req, res, next) => {
  /* logs the session object 
  properties can also be set to that session 
  ex. can track how times the user visits the route */
  console.log(req.session);
  /* when viewCount property gets set in the session object, that property is stored in 
  the session store/database */
  if (req.session.viewCount) {
    req.session.viewCount++;
  } else {
    req.session.viewCount = 1;
  }
  res.send(
    `<h1>You have visited this page ${req.session.viewCount} time(s).</h1>`
  );
});

app.listen(3000);
