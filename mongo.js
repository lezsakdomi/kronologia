const Mongo = require('mongodb')
// noinspection NpmUsedModulesInstalled
const process = require('process')
const debug = require('debug')('kronologia:backend:mongo')

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017' //TODO config
const db = process.env.MONGODB_DB || 'kronologia' //TODO config

module.exports = new Promise((resolve, reject) => Mongo.MongoClient.connect(url, (err, client) => {
	if (err) {
		debug('MongoDB connection failed')
		reject(err)
	} else {
		debug('Connection succeed')
		resolve(client.db(db))
	}
}))

//TODO client.close();