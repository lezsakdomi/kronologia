const express = require('express')
const MongoClient = require('mongodb')
const createError = require('http-errors')
const mongo = require('./mongo')
const debug = require('debug')('kronologia:backend:quizRouter')

const router = express.Router({})
module.exports = router

// noinspection JSUnresolvedFunction
router.use(async (req, res, next) => {
	debug('Awaiting MongoDB connection...')
	try {
		req.db = await mongo
		if (1 === 2) {
			req.db = MongoClient.connect('', {})
		}
		next()
	} catch (e) {
		next(e)
	}
})

// noinspection JSUnresolvedFunction
router.get(['/', '/index.html'], async (req, res, next) => {
	try {
		const query = {}

		if (req.user) {
			query.userId = req.user.globalId
		} else {
			query.userId = {$exists: false}
		}

		res.locals.quizzes = await req.db.collection('quizzes').find(query, {_id: 1, title: 1}).toArray()
		next()
	} catch (e) {
		next(e)
	}
})

// noinspection JSUnresolvedFunction
router.get('/', (req, res) => res.json(res.locals.quizzes))

// noinspection JSUnresolvedFunction
router.get('/index.html', (req, res) => res.render('quiz-list/template'))

//noinspection JSUnresolvedFunction
router.get('/new.html', (req, res) => {
	return res.render('quiz-form/template', {quiz: {}, editable: true, action: 'new'})
})

// noinspection JSUnresolvedFunction
router.post('/new', async (req, res, next) => {
	try {
		const document = req.body

		normalizeInput(document)

		const response = await req.db.collection('quizzes').insertOne(document)
		res.json(response)
	} catch (e) {
		next(e)
	}
})

const quizRouter = express.Router({})

// noinspection JSUnresolvedFunction
router.use('/:qid([0-fA-F]{24}|[\0-\255]{12})', async (req, res, next) => {
	// noinspection JSUnresolvedVariable
	debug('Fetching quiz \'%s\'...', req.params.qid)
	try {
		// noinspection JSUnresolvedVariable
		// noinspection JSUnresolvedVariable
		const quiz = await req.db.collection('quizzes').findOne({
			$or: [
				{_id: req.params.qid},
				{_id: MongoClient.ObjectID(req.params.qid)},
			],
		})
		debug('Fetched: %o', quiz)
		res.locals.quiz = quiz
		next()
	} catch (e) {
		next(e)
	}
}, quizRouter)
// noinspection JSUnresolvedFunction
quizRouter.get('/', (req, res) => res.json(res.locals.quiz))
// noinspection JSUnresolvedFunction
quizRouter.post('/check', (req, res, next) => {
	try {
		const fails = []
		const successes = []

		normalizeInput(req.body)

		{
			debug('Checking for orders...')
			const orderedInputIndexesByOrder = Object.entries(req.body.entries)
				.filter(([i, e]) => e.order)
				.sort(([ai, a], [bi, b]) => a.order === b.order ? 0 : (a.order > b.order ? 1 : -1))
				.map(([i]) => i)
			let lastOrder = 0
			let lastBlockOrder = 0
			let maxBlockOrder = 0
			for (let i = 0; i < orderedInputIndexesByOrder.length; i++) {
				const eid = orderedInputIndexesByOrder[i]
				if (!res.locals.quiz.entries[eid].order) {
					continue
				}

				debug('  Checking for eid %d', eid)

				const currentOrder = res.locals.quiz.entries[eid].order
				debug('    Reference order: %d', currentOrder)
				if (i > 0) {
					const prevEid = orderedInputIndexesByOrder[i - 1]
					debug('    Previous: %d', prevEid)
					if (req.body.entries[eid].order !== req.body.entries[prevEid].order) {
						if (currentOrder < maxBlockOrder) {
							fails.push({
								eid,
								property: 'order',
								message: 'Not in order',
							})
						} else {
							successes.push({
								eid,
								property: 'order',
								message: 'Follows in order',
							})
						}
						lastBlockOrder = maxBlockOrder
						maxBlockOrder = currentOrder
					} else { // e.order === prevE.order
						debug('    (same block)')
						if (currentOrder < lastBlockOrder) {
							fails.push({
								eid,
								property: 'order',
								message: 'Before than previous',
							})
						} else {
							successes.push({
								eid,
								property: 'order',
								message: 'May follow in order',
							})
						}
						maxBlockOrder = Math.max(maxBlockOrder, currentOrder)
					}
				} else {
					successes.push({
						eid,
						property: 'order',
						message: 'Starting point',
					})
					lastBlockOrder = maxBlockOrder
					maxBlockOrder = currentOrder
				}
				lastOrder = currentOrder
			}
		}

		{
			debug('Checking for answers...')
			for (let eid in req.body.entries) {
				const property = 'answer'
				if (req.body.entries[eid][property] === '') {
					continue
				}
				debug('  Checking for #%d', eid)
				// noinspection EqualityComparisonWithCoercionJS
				if (res.locals.quiz.entries[eid][property] != req.body.entries[eid][property]) {
					fails.push({
						eid,
						property,
						message: 'Doesn\'t match',
						solution: res.locals.quiz.entries[eid][property],
					})
				} else {
					successes.push({
						eid,
						property,
						message: 'Does match',
					})
				}
			}
		}

		/*
		{
			debug("Checking for latter...")
			for (let eid in req.body.entries) {
				for (let property in req.body.entries[eid]) {
					if (req.body.entries[eid][property] === '') continue
					debug("Checking for property '%s' of entry #%d", property, eid)
					if (res.locals.quiz.entries[eid][property] != req.body.entries[eid][property]) {
						fails.push({
							eid,
							property,
							message: "Doesn't match"
						})
					}
				}
			}
		}
		*/

		res.json({fails, successes})
	} catch (e) {
		next(e)
	}
})

// noinspection JSUnresolvedFunction
quizRouter.get('/form.html', (req, res) => {
	return res.render('quiz-form/template', {action: 'check', editable: false})
})

// noinspection JSUnresolvedFunction
quizRouter.get('/hinted-form.html', (req, res) => {
	return res.render('quiz-form/template', {action: 'check', editable: false, hint: true})
})

// noinspection JSUnresolvedFunction
quizRouter.post('/update', async (req, res, next) => {
	try {
		const document = req.body

		if ((req.user && req.user.globalId) !== res.locals.quiz.userId) {
			next(createError(403))
		}

		normalizeInput(document)

		document._id = res.locals.quiz._id

		const response = await req.db.collection('quizzes').replaceOne(res.locals.quiz, document)
		res.json(response)
	} catch (e) {
		next(e)
	}
})

// noinspection JSUnresolvedFunction
quizRouter.get('/edit.html', (req, res) => {
	return res.render('quiz-form/template', {action: 'update', editable: true})
})

// noinspection JSUnresolvedFunction
quizRouter.get('/dump.html', (req, res) => {
	return res.render('quiz-form/template', {action: false, dump: true})
})

// noinspection JSUnresolvedFunction
quizRouter.get('/dump.tsv', (req, res) => {
	res.type('tsv')
	return res.end(Object.values(res.locals.quiz.entries).map(({question, answer}) => `${question}\t${answer}`).join("\n")) //TODO this is not very safe
})

quizRouter.post('/delete', async (req, res, next) => {
	try {
		if ((req.user && req.user.globalId) !== res.locals.quiz.userId) {
			next(createError(403))
		}

		const response = await req.db.collection('quizzes').deleteOne({_id: res.locals.quiz._id})
		res.json(response)
	} catch (e) {
		next(e)
	}
})

// noinspection JSUnresolvedFunction
quizRouter.get('/delete.html', (req, res) => {
	res.render('quiz-form/template', {action: 'delete', editable: true})
})

function normalizeInput(quiz) {
	for (eid in quiz.entries) {
		quiz.entries[eid].order = parseInt(quiz.entries[eid].order)
	}

	if (quiz._id) {
		quiz._id = MongoClient.ObjectID(quiz._id)
	}
}
