import I18n from '../../modules/i18n.js'

window.i18n = new I18n('about')
	.defineContentTranslation('title', 'title')
	.defineContentTranslation('h1', 'header')
	.defineContentTranslation('h2#purposeH', 'purpose.title')
	.defineContentTranslation('p#purpose', 'purpose.text')
	.defineContentTranslation('h2#documentationH', 'documentation.title')
	.defineContentTranslation('p#documentation', 'documentation.text')
	.defineContentTranslation('h2#contributorsH', 'contributors.title')
	.defineContentTranslation('p#contributors', 'contributors.text')
	.defineContentTranslation('h2#currentVersionH', 'currentVersion.title')
	.defineContentTranslation('.envVarName > span',
		'envVars.label', (td) => ({context: td.parentElement.parentElement.attributes['var-name'].value}))
	.defineMultiButtonTranslation('changeLog')
	.defineContentTranslation('p#cantDetectCurrentVersion', 'currentVersion.errorMessage')
	.bindDocumentOnLoad()