import I18n from '../../modules/i18n.js'

window.i18n = new I18n('index')
	.defineContentTranslation('head > title', 'title')
	.defineContentTranslation('body > h1', 'heading')
	.defineContentTranslation('p#instruction', 'instruction',
		{count: document.querySelectorAll('p#instruction ~ ul > li').length})
	.defineContentTranslation('a#auth', 'links.auth')
	.defineContentTranslation('a#quizzes', 'links.quizzes')
	.defineContentTranslation('a#wiki', 'links.wiki')
	.defineContentTranslation('span#lngInstruction', 'lngInstruction')
	.defineContentTranslation('a.lng', 'lng', ({attributes: {lng: {value: lng}}}) => ({context: lng}))
	.bindDocumentOnLoad()