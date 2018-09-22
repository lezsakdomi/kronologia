const express = require('express')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const session = require('express-session')
const passport = require('passport')
const config = require('config')
const stylus = require('stylus')
// noinspection JSUnusedLocalSymbols
const debug = require('debug')('kronologia:backend:app')

const app = express()
module.exports = app

app.locals.config = config
app.locals.env = process.env
app.locals.randomColor = require('randomcolor')
app.set('view engine', 'pug')
app.set('views', 'assets/views')
app.use(logger('dev'))
// noinspection JSUnresolvedFunction
app.use('/assets', stylus.middleware('assets'))
app.use('/assets', express.static('assets', {
	dotfiles: 'deny',
	etag: true,
	fallthrough: false,
	immutable: app.get('env') === 'production',
	index: false,
	maxAge: '1h',
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
if (config.get('acceptMultipart')) {
	app.use(require('multer')().none())
}
if (config.get('session')) {
	// noinspection JSCheckFunctionSignatures
	app.use(session({
		secure: config.get('secure'),
		secret: config.get('secret'),
		resave: config.get('session.resave'),
		saveUninitialized: config.get('session.saveUninitialized'),
	}))
	// noinspection JSUnresolvedFunction
	app.use(passport.initialize())
	// noinspection JSUnresolvedFunction
	app.use(passport.session())
}

app.use('/auth', require('./auth-router'))
app.use('/quizzes', require('./quizzes-router'))
// noinspection JSUnresolvedFunction
app.get('/', (req, res) => res.status(307).redirect('/index.html'))
// noinspection JSUnresolvedFunction
app.get('/index.html', (req, res) => res.render('index/template'))
// noinspection JSUnresolvedFunction
app.get('/about/index.html', (req, res) => res.render('about/template'))
