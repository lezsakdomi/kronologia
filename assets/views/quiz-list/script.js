import I18n from '../../modules/i18n.js'

window.i18n = new I18n('quiz-list')
	.defineContentTranslation('head > title', 'title')
	.defineContentTranslation('body > h1', 'heading')
	.defineMultiButtonTranslation('edit')
	.defineMultiButtonTranslation('delete')
	.defineMultiButtonTranslation('dump')
	.defineButtonTranslation('add')
	.bindDocumentOnLoad()