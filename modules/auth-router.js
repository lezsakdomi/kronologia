const createError = require('http-errors')
const express = require('express')
const passport = require('passport')
const mongo = require('./mongo')
const config = require('config')
const debug = require('debug')('kronologia:backend:app:auth')

const router = express.Router({})
module.exports = router

const validProviders = []
for (let provider in config.get("auth")) {
	if (!config.has(`auth.${provider}`)) continue
	const strategyConfig = config.get(`auth.${provider}`)
	if (!strategyConfig) continue

	debug("Processing auth provider '%s'...", provider)
	// noinspection JSUnresolvedVariable
	const providerDebug = require('debug')(debug.namespace + ':' + provider)

	providerDebug("Strategy configured with the following options:\n%O", strategyConfig)

	const moduleName =
		strategyConfig.has(`module`)
			? strategyConfig.get(`module`)
			: `passport-${provider}`
	providerDebug("Module: %o", moduleName)

	const strategyName =
		strategyConfig.has(`strategy`)
			? strategyConfig.get(`strategy`)
			: "Strategy"
	providerDebug("Strategy: %o", strategyName)

	providerDebug("Loading authentication strategy...")
	const Strategy = require(moduleName)[strategyName]
	providerDebug("Authentication strategy loaded")
	// noinspection JSUnresolvedFunction
	passport.use(new Strategy(strategyConfig, (...args) => {
		const tokens = args.slice(0, args.length - 3)
		const profile = args[args.length - 2]
		const done = args[args.length - 1]

		providerDebug("Authentication happened with tokens %o. Got profile %O", tokens, profile)

		done(null, profile)
	}))

	validProviders.push(provider)
}

(async () => {
	try {
		const db = await mongo
		// noinspection JSUnresolvedFunction
		const collection = db.collection('users')
		// noinspection JSUnresolvedFunction
		passport.serializeUser(async (user, done) => {
			try {
				await collection.updateOne({_id: user.id}, {$set: user}, {upsert: true})
				done(null, user.id)
			} catch (e) {
				done(e)
			}
		})
		// noinspection JSUnresolvedFunction
		passport.deserializeUser(async (serialized, done) => {
			try {
				const user = await collection.findOne({_id: serialized})
				done(null, user)
			} catch (e) {
				done(e)
			}
		})
	} catch (e) {
		console.warn("Failed to initiate passport serialization, using " +
			"space-consuming fallback method instead. Cause: %O", e)
		// noinspection JSUnresolvedFunction
		passport.serializeUser((user, done) => done(null, user))
		// noinspection JSUnresolvedFunction
		passport.deserializeUser((serialized, done) => done(null, serialized))
	}
	debug("Serialization configured")
})()

// noinspection JSUnresolvedFunction
router.get('/index.html',
	(req, res) => res.render('auth-list/template', {user: req.user, validProviders}))

// noinspection JSUnresolvedFunction
router.use('/:authStrategy', //TODO POST (or get)
	function ({params: {authStrategy: strategy}}, undefined, next) {
		if (!config.has(`auth.${strategy}`) || !config.get(`auth.${strategy}`)) {
			return next(createError(404, "Authentication strategy not supported"))
		}

		const options =
			config.has(`auth.${strategy}.options`) ? config.get(`auth.${strategy}.options`) : {}
		// noinspection JSUnresolvedFunction
		const authenticator = passport.authenticate(strategy, {
			session: Boolean(config.get('session')),
			...options
		})
		authenticator(...arguments)
	},
	//(req, res) => res.redirect('/users/' + req.user.username))
	(req, res) => res.json(req.user)) //TODO

// noinspection JSUnresolvedFunction
router.get('/', (req, res) => res.json(req.user)) //TODO remove