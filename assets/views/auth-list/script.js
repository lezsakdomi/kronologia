import I18n from '../../modules/i18n.js'

window.i18n = new I18n('auth-list')
	.defineContentTranslation('head > title', 'title')
	.defineContentTranslation('body > h1', 'heading')
	.defineContentTranslation('p#note', 'note')
	.defineContentTranslation('p#instruction', 'instruction',
		{count: document.querySelectorAll('ul > li#provider').length})
	.defineContentTranslation('li.provider > a', 'providerOption', ({attributes: {href: {value: href}}}) =>
		({context: href, defaultValue: href[0].toUpperCase() + href.slice(1)}))
	.defineContentTranslation('li#logout > a', 'logout')
	.bindDocumentOnLoad()