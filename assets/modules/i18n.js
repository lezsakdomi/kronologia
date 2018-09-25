import i18next from 'https://unpkg.com/i18next@11.9.0/dist/es/index.js'
import i18nextXHRBackend from 'https://unpkg.com/i18next-xhr-backend@1.5.1/dist/es/index.js'
import i18nextBrowserLanguageDetector from 'https://unpkg.com/i18next-browser-languagedetector@2.2.3/dist/es/index.js'

export default class I18n {
	constructor(namespace, options = {}) {
		this.i18next = i18next.createInstance()

		this.promise = new Promise((resolve) => {
			this.i18next
				.use(i18nextXHRBackend)
				.use(i18nextBrowserLanguageDetector)
				.init({
					fallbackLng: 'dev',
					ns: [namespace],
					defaultNS: namespace,
					backend: {
						loadPath: '/assets/views/{{ns}}/locales/{{lng}}.json',
					},
					interpolation: {
						format: (value, format, lng) => Function('return (' + format + ')')()(value, lng),
					},
					...options,
				}, (err, t) => {
					if (err) {
						console.error(err)
					}

					this.t = t
					resolve(t)
				})
		})

		this.boundDocuments = []

		this.definedTranslations = []
	}

	then(successHandler, failHandler = undefined) {
		return this.promise.then(successHandler, failHandler)
	}

	dispatchTranslation(document, selector, f, keys, options = {}) {
		document.querySelectorAll(selector).forEach((element) => {
			let options_ = options

			if (options_ instanceof Function) {
				options_ = options_(element)
			}

			this.promise.then((t) => {
				const text = t(keys, options_)
				f(element, text)
			})
		})

		return this
	}

	bindLoadedDocument(document) {
		this.boundDocuments.push(document)

		this.definedTranslations.forEach((translation) => this.dispatchTranslation(document, ...translation))

		return this
	}

	bindDocumentOnLoad(doc = window.document) {
		doc.addEventListener('DOMContentLoaded', () => this.bindLoadedDocument(doc))

		return this
	}

	defineContentTranslation(selector, keys, options = {}) {
		this.definePropertyTranslation(selector, 'innerHTML', keys, options)

		return this
	}

	defineInputTranslation(name, options = {}) {
		this.definePropertyTranslation(`input[name="${name}"], input[name$="[${name}]"]`, 'placeholder',
			[`fields.${name}`, 'fields.generic'], (e) => ({
				context: e.type,
				...(options instanceof Function ? options(e) : options),
			}))

		return this
	}

	defineButtonTranslation(name, options = {}) {
		this.defineContentTranslation(`button#${name}`, `buttons.${name}`, options)

		return this
	}

	defineMultiButtonTranslation(name, options = {}) {
		this.defineContentTranslation(`button.${name}`, `buttons.${name}`, options)

		return this
	}

	defineLabelTranslation(name, options = {}) {
		this.defineContentTranslation(`label[for="${name}"]`,
			[`fields.${name}`, 'fields.generic'], (e) => {
				const myOptions = {}
				const input = document.querySelector(`input#${name}`)
				if (input) {
					myOptions.context = input.type
				}

				return {...myOptions, ...(options instanceof Function ? options(e) : options)}
			})

		return this
	}

	definePropertyTranslation(selector, property, keys, options = {}) {
		this.defineTranslation(selector,
			(element, text) => element[property] = text, keys, (element) => ({
				defaultValue: element[property],
				...(options instanceof Function ? options(element) : options),
			}))

		return this
	}

	defineTranslation(selector, f, keys, options = {}) {
		this.definedTranslations.push([selector, f, keys, options])

		this.boundDocuments.forEach((document) => this.dispatchTranslation(document, selector, f, keys, options))

		return this
	}

	translateInstantly(key, defaultValue, options = {}) {
		if (this.t) {
			return this.t(key, {defaultValue, ...options})
		} else {
			return defaultValue
		}
	}

	alert(key, message = 'Something happened', options = {}) {
		return i18n.then((t) => {
			const translatedMessage = t(key, {defaultValue: message, ...options})
			return alert(translatedMessage)
		}, () => {
			return alert(message)
		})
	}
}