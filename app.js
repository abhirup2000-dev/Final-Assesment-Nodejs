// Suppress util.isArray deprecation warning caused by older third-party packages (like lodash/cloudinary)
const util = require('util');
Object.defineProperty(util, 'isArray', { value: Array.isArray, enumerable: true, writable: true, configurable: true });

require('dotenv').config()
const express = require('express')
const path = require("path")
const morgan = require('morgan')
const helmet = require('helmet')
const session = require('express-session')
const flash = require("connect-flash");
const cookieparser = require('cookie-parser')
const methodOverride = require("method-override");

const app = express()


// DB
const ConnectDatabase = require('./app/config/dbconfig')
ConnectDatabase()

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.set('view engine', 'ejs')
app.set('views', 'views')

app.use(express.static(path.join(__dirname, "public")));

app.use(morgan('dev'))
app.use(
  helmet({
    contentSecurityPolicy: false,
    xDownloadOptions: false,
  }),
);
app.use(cookieparser())
app.use(
  session({
    secret: "keyboardcat",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  }),
);
app.use(flash())

app.use(methodOverride("_method"));

app.use((req, res, next) => {
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});



app.use(require('./app/routes/index'))



app.listen(process.env.PORT, (err)=>{
  if(err){
    console.log(`failed to start the server ${err.message} `)
  }
  console.log(`Server running on port http://localhost:${process.env.PORT}`)
})