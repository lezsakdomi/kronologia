const i18n = new Promise((resolve, reject) => {
	return i18next
		.use(i18nextXHRBackend)
		.use(i18nextBrowserLanguageDetector)
		.init({
			fallBackLng: 'dev',
			debug: true,
			ns: 'auth-list',
			defaultNS: 'auth-list',
			backend: {
				loadPath: '/assets/views/{{ns}}/locales/{{lng}}.json',
			},
			interpolation: {
				format: (value, format, lng) => Function('return (' + format + ')')()(value, lng),
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

	translateContents('p#note', 'note')

	translateContents('p#instruction', 'instruction',
		{count: document.querySelectorAll('ul > li#provider').length})

	translateContents('li#provider > a', 'providerOption', ({attributes: {href: {value: href}}}) =>
		({context: href, defaultValue: href[0].toUpperCase() + href.slice(1)}))

	function translateContents(selector, keys, options = {}) {
		return translateProperty(selector, 'innerHTML', keys, options)
	}

	function translateProperty(selector, property, keys, options = {}) {
		const elements = document.querySelectorAll(selector)
		elements.forEach((e) => i18n.then((t) => {
			e[property] = t(keys, {
				defaultValue: e[property],
				...(options instanceof Function ? options(e) : options),
			})
			console.debug(`translateProperty(${selector}.${property}, ${keys}, `, options, `) ==`,
				e[property])
		}))
	}
})