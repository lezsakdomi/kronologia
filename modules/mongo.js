const Mongo = require('mongodb')
// noinspection NpmUsedModulesInstalled
const process = require('process')
const config = require('config')
const debug = require('debug')('kronologia:backend:mongo')

const mongoClient = new Mongo.MongoClient(config.get('mongo.url'), config.get('mongo.options'))

module.exports = new Promise((resolve, reject) => mongoClient.connect((err, client) => {
	if (err) {
		debug('MongoDB connection failed')
		reject(err)
	} else {
		debug('Connection succeed')

		let db
		if (config.has('mongo.db')) {
			db = config.get('mongo.db')
		}

		resolve(client.db(db))
		debug('Selected database %o', db || client.s.options.dbName)
	}
}))

//TODO client.close();