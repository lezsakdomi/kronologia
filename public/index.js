const i18n = new Promise((resolve, reject) => {
	return i18next
		.use(i18nextXHRBackend)
		.use(i18nextBrowserLanguageDetector)
		.init({
			fallBackLng: 'dev',
			debug: true,
			ns: ['index', 'glossary'],
			defaultNS: 'index',
			backend: {
				loadPath: "/locales/{{lng}}/{{ns}}.json"
			},
			interpolation: {
				format: (value, format, lng) => Function('return (' + format + ')')()(value, lng)
			},
		}, (err, t) => {
			if (err) {
				console.error(err)
				//reject(err)
				resolve(t)
			} else {
				resolve(t)
			}
		})
})

document.addEventListener('DOMContentLoaded', () => {
	translateContents('head > title', 'title')

	translateContents('body > h1', 'heading')

	translateContents('p#instruction', 'instruction',
		{count: document.querySelectorAll('p#instruction ~ ul > li').length})

	translateContents('a#auth', 'links.auth')

	translateContents('a#quizzes', 'links.quizzes')

	translateContents('a#wiki', 'links.wiki')

	translateContents('span#lngInstruction', 'lngInstruction')

	translateContents('a.lng', 'lng', ({attributes: {lng: {value: lng}}}) => ({context: lng}))

	function translateContents(selector, keys, options = {}) {
		return translateProperty(selector, 'innerHTML', keys, options)
	}

	function translateProperty(selector, property, keys, options = {}) {
		const elements = document.querySelectorAll(selector)
		elements.forEach(e => i18n.then(t => {
			e[property] = t(keys, {
				defaultValue: e[property],
				...(options instanceof Function ? options(e) : options)
			})
			console.debug(`translateProperty(${selector}.${property}, ${keys}, `, options, `) ==`,
				e[property])
		}))
	}
})