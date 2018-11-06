if (shuffleFactor === undefined) {
	shuffleFactor = 1
}

if (autoOrdering === undefined) {
	autoOrdering = true
}

if (locale === undefined) {
	locale = 'en'
}

import I18n from '../../modules/i18n.js'

const i18n = new I18n('quiz-form', {fallBackLng: locale})
	.defineContentTranslation('p#quiznotfound', 'messages.notfound')
	.defineContentTranslation('p#invalidquiz', 'messages.invalid')
	.defineInputTranslation('title')
	.defineInputTranslation('question')
	.defineInputTranslation('answer')
	.defineInputTranslation('order')
	.defineButtonTranslation('add')
	.definePropertyTranslation('input[type="submit"]', 'value', 'buttons.submit',
		({form: {attributes: {action: {value: a}}}}) => ({context: a, defaultValue: a}))
	.defineLabelTranslation('showBg')
	.defineButtonTranslation('sort')
	.defineButtonTranslation('renumber')

document.addEventListener('DOMContentLoaded', () => prepareDocument(document))

window.onbeforeunload = () => {
	if (!window.remoteData) {
		return
	} // No initialization yet

	if (JSON.stringify(gatherData()) !== JSON.stringify(window.remoteData)) {
		return i18n.translateInstantly('messages.notsaved', 'Nothing were saved. Are you sure?')
	}
}

window.addEventListener('scroll', () => {
	// Yes, I know about https://developer.mozilla.org/docs/Mozilla/Performance/ScrollLinkedEffects
	// Basically, the canvas position can be arbitrary, it just limits the rendering surface

	const canvas = document.querySelector('canvas#timeline')

	canvas.style.top = window.scrollY
})

window.addEventListener('resize', () => {
	const canvas = document.querySelector('canvas#timeline')
	const rect = canvas.getBoundingClientRect()

	canvas.width = rect.width
	canvas.height = rect.height
})

document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.querySelector('canvas#timeline')
	const rect = canvas.getBoundingClientRect()

	canvas.width = rect.width
	canvas.height = rect.height
})

document.addEventListener('DOMContentLoaded', () => {
	fixOrders()
	window.remoteData = gatherData()
	redrawTimeline()
})

function registerHandlers(document) {
	handleEvent('input[name$="[order]"]', 'change', ({target: orderInput}) => {
		const tr = orderInput.parentElement.parentElement

		reorderStart()
		findPositionAndPlace(tr)
		reorderEnd()
	})

	Object.entries({
		'.down': generateCleverPushFunction(1),
		'.up': generateCleverPushFunction(-1),
		'.remove': removeTr,
	}).forEach(([selector, dOrder]) => {
		customClick(selector, ({target: button}) => {
			const tr = button.parentElement.parentElement
			const orderInput = tr.querySelector('input[name$="[order]"]')

			reorderStart()
			dOrder(tr)
			findPositionAndPlace(tr)
			reorderEnd()
		})
	})

	customClick('form[action="check"] input[type=submit]', () => checkForm(true))

	handleEvent('#showBg', 'change', ({target: checkbox}) => {
		const tbody = document.querySelector('tbody')

		if (checkbox.checked) {
			tbody.classList.add('show-bg')
		} else {
			tbody.classList.remove('show-bg')
		}
	}, true)

	customClick('button#add', () => {
		const tbody = document.querySelector('tbody')

		let eid = 0
		while (document.querySelector('tr[eid="' + eid + '"]')) eid++
		const order = [...document.querySelectorAll('input[name$="[order]"]')]
				.map((input) => parseInt(input.value || 0))
				.reduce((a, v) => Math.max(a, v), 0)
			+ 1
		tbody.insertAdjacentHTML('beforeend', `
	<tr style="--background-color: ${randomColor({seed: eid})}" eid="${eid}">
		<td class="question">
			<input type="text" name="entries[${eid}][question]" placeholder="Question">
		</td>
		<td class="answer">
			<input type="text" name="entries[${eid}][answer]" placeholder="Answer">	
		</td>
		<td class="order">
			<input type="number" name="entries[${eid}][order]" placeholder="Order" value="${order}">
			<div class="down"></div>
			<div class="up"></div>
			<div class="remove"></div>
		</td>
	</tr>`)
		prepareDocument(tbody.lastChild)
		document.querySelector('input[name="entries[' + eid + '][question]"]').focus()
	})

	customClick('#sort', () => {
		const tbody = document.querySelector('tbody')

		reorderStart()
		const trs = [...document.querySelectorAll('tr')]
			.filter((tr) => tr.querySelector('input[name$="[answer]"]').value !== '')
			.sort((tr_a, tr_b) => {
				// Just checking in alphabetical order
				const a = tr_a.querySelector('input[name$="[answer]"]').value
				const b = tr_b.querySelector('input[name$="[answer]"]').value
				return a.localeCompare(b, locale, {ignorePunctuation: true}, 'sort')
			})
		trs.forEach((tr, i) => tr.querySelector('input[name$="[order]"]').value = i + 1)
		trs.forEach((tr) => tbody.removeChild(tr))
		trs.forEach((tr) => tbody.appendChild(tr))
		reorderEnd()
	})

	customClick('#renumber', () => {
		const data = gatherData()

		if (data.entries) {
			data.entries = Object.values(data.entries)
				.sort((a, b) => a.order.localeCompare(b.order, locale, {numeric: true}))
		} else {
			console.warn('dataObject.entries is empty!', data)
		}

		updateData(data, true)
	})

	customClick('form[action="update"] input[type=submit]', () => updateData(), false)

	handleEvent('input', 'change', () => {
		if (!window.reorderInProgress) {
			autoCheck()
		}
	})
	autoCheck()

	customClick('form[action="new"] input[type=submit]', () => newQuiz(undefined, true))

	customClick('form[action="delete"] input[type=submit]', () => deleteQuiz(true))

	function customClick(selector, handler) {
		handleEvent(selector, 'click', function (evt) {
			try {
				handler.apply(this, arguments)
			} finally {
				evt.preventDefault()
			}
		})
	}

	function handleEvent(selector, event, handler, fireNow = false) {
		const elements = document.querySelectorAll(selector)
		elements.forEach((e) => e.addEventListener(event, handler))

		if (fireNow) {
			elements.forEach((element) => {
				try {
					handler.call(this, {
						type: event,
						target: element,
					})
				} catch (e) {
					console.error(e)
				}
			})
		}
	}
}

function prepareDocument(document) {
	registerHandlers(document)
	i18n.bindLoadedDocument(document)
}

document.addEventListener('DOMContentLoaded', () => {
		const f = () => {
			redrawTimeline()
			requestAnimationFrame(f)
		}

		f()
	},
)

// SlipJS integration
document.addEventListener('DOMContentLoaded', () => {
	const tbody = document.querySelector('tbody')

	new Slip(tbody)

	tbody.addEventListener('slip:beforewait', (evt) => {
		const {target} = evt
		if (target.classList.contains('question')) {
			evt.preventDefault()
		}
	})

	tbody.addEventListener('slip:beforereorder', (evt) => {
		let tr = evt.target
		while (tr.tagName !== 'TR') tr = tr.parentElement

		tr.lastSlipBeforeReorder = evt
	})

	tbody.addEventListener('slip:reorder', (evt) => {
		const {target: tr, detail: {insertBefore}} = evt
		const orderInput = tr.querySelector('input[name$="[order]"]')
		const startTime = new Date(tr.lastSlipBeforeReorder.timeStamp)
		const endTime = new Date(evt.timeStamp)

		tr.style.transform = null

		if (tr.nextElementSibling === insertBefore) {
			if (endTime - startTime < 200) { // Just touched
				if (orderInput.value === '') {
					orderInput.value = parseInt(document.querySelector(
						'tr:last-child input[name$="[order]"]',
					).value || 0) + 1
					reorderStart()
					tbody.insertBefore(tr, null)
					reorderEnd()
				} else {
					// it was an accident
				}
			}
		} else {
			tbody.insertBefore(tr, insertBefore)

			if (insertBefore === null) {
				// inserted to end of list
				orderInput.value = [...document.querySelectorAll('input[name$="[order]"]')]
						.map((input) => parseInt(input.value || 0))
						.reduce((a, v) => Math.max(a, v), 0)
					+ 1
				autoCheck()
			} else if (tr.previousElementSibling === null || tr.previousElementSibling
				.querySelector('input[name$="[order]"]').value === '') {
				if (tr.nextElementSibling && tr.nextElementSibling
					.querySelector('input[name$="[order]"]').value === '') {
					// noop; let the users to freely organise their stuff
				} else {
					const shift = insertBefore.querySelector('input[name$="[order]"]').value - 2

					document.querySelectorAll('input[name$="[order]"]:not(:placeholder-shown)')
						.forEach((orderInput) => orderInput.value -= shift)

					orderInput.value = 1

					autoCheck()
				}
			} else if (insertBefore) {
				orderInput.value = insertBefore.querySelector('input[name$="[order]"]').value

				if (tr.previousElementSibling.querySelector(
					'input[name$="[order]"]').value < orderInput.value - 1) {
					// enough space before
					orderInput.value--
				} else {
					// get empty place for this
					insertBefore.querySelector('input[name$="[order]"]').value++
					for (let tr = insertBefore.nextElementSibling; tr !== null;
						 tr = tr.nextElementSibling) {
						if (tr.nextElementSibling &&
							tr.querySelector('input[name$="[order]"]').value >
							tr.previousElementSibling.querySelector(
								'input[name$="[order]"]').value) {
							break
						}
						tr.querySelector('input[name$="[order]"]').value++
					}
				}
				// prepare for bugs
				reorderStart()
				findPositionAndPlace(tr)
				reorderEnd()
				if (tr.lastOffsetTop !== tr.nextOffsetTop) {
					console.warn('Reorder was needed')
				}
			}
		}
	})
})

function redrawTimeline(inputSelector = 'input[name$="[answer]"]:not(:focus)') {
	// Recommended alternative inputSelector: 'tr:not(.slip-reordering) input[name$="[order]"]'
	const canvas = document.querySelector('canvas#timeline')
	const canvasRect = canvas.getBoundingClientRect()
	const ctx = canvas.getContext('2d')

	ctx.clearRect(0, 0, canvas.width, canvas.height)

	const dates = []; // entities to render
	
	[...document.querySelectorAll('tr')]
		.filter((tr) => tr.querySelector(inputSelector))
		.filter((tr) => tr.querySelector(inputSelector).value !== '')
		.filter((tr) => {
			const rect = tr.getBoundingClientRect()
			return canvasRect.top < rect.top && rect.bottom < canvasRect.bottom
		}).forEach((tr) => {
			const rect = tr.getBoundingClientRect()
			rect.center = {
				y: (rect.top + rect.bottom) / 2
			}

			tr.querySelector(inputSelector).value.split(/-|, ?/).forEach((part) => {
				if (!isFinite(part)) return
				const date = parseInt(part)

				dates.push({rect, date, tr})
			})
		})

	if (dates.length < 2) {
		return
	}

    const firstDate = dates.reduce((a, v) => a.date < v.date ? a : v, dates[0])
    const lastDate = dates.reduce((a, v) => a.date > v.date ? a : v, dates[0])

	// Some interval lengths
    const dateRange = lastDate.date - firstDate.date;
    const dotYRange = lastDate.rect.center.y - firstDate.rect.center.y;

	/**
	 * Variables:
	 *   dotX, dotY: Where to render the bullet (bullet on the timeline)
	 *   targetX, targetY: Where to stroke the line
	 */

	//*
	let dotX = 0 // dotX is same, so defined here
	try {
		dotX = parseFloat(getComputedStyle(canvas).getPropertyValue('--dotX'))
		assert(isFinite(dotX), 'dotX is finite')
	} catch (e) {
		console.error(e.message)
	}
	//*/let dotX = 5

	// Stroke the line for the bullets
	ctx.strokeStyle = (firstDate.rect.center.y < lastDate.rect.center.y) ? 'green' : 'red'
	ctx.beginPath()
	ctx.moveTo(dotX, cy(Math.min(firstDate.rect.top, lastDate.rect.top)))
	ctx.lineTo(dotX, cy(Math.max(firstDate.rect.bottom, lastDate.rect.bottom)))
	ctx.stroke()

	ctx.strokeStyle = 'black'
	ctx.fillStyle = 'black'
	dates.forEach((date) => {
		const dotY = cy(dotYRange / dateRange * (date.date - firstDate.date) + firstDate.rect.center.y)
		const targetX = cx(date.rect.left)
		const targetY = cy(date.rect.center.y)

		//console.log(tr, dotY, targetX, targetY)

		// Bullet
		ctx.beginPath()
		ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI)
		ctx.fill()

		// Line
		ctx.beginPath()
		ctx.moveTo(dotX, dotY)
		ctx.lineTo(targetX, targetY)
		ctx.stroke()
	})

	function cx(x) { // viewport x to canvas x
		return (x - canvasRect.left) / canvasRect.width * canvas.width
	}

	function cy(y) { // viewport y to canvas y
		return (y - canvasRect.top) / canvasRect.height * canvas.height
	}
}

function reorderStart(trs = document.querySelectorAll('tr')) {
	window.reorderInPorgress = true
	if (trs instanceof HTMLElement) {
		trs = arguments
	}
	for (let tr of trs) {
		tr.style.transition = 'none'
		tr.lastOffsetTop = tr.offsetTop
	}
}

function reorderEnd(trs = document.querySelectorAll('tr')) {
	window.reorderInPorgress = false
	autoCheck()
	if (trs instanceof HTMLElement) {
		trs = arguments
	}
	trs.forEach((tr) => {
		tr.style.transition = 'none'
		tr.nextOffsetTop = tr.offsetTop
		tr.style.top = tr.lastOffsetTop - tr.nextOffsetTop + 'px'
		fs(null, () => tr.style.transition = null, () => tr.style.top = '0px')
	})
}

function gatherData() {
	const form = document.querySelector('form')
	// noinspection JSCheckFunctionSignatures
	const formData = new FormData(form)

	const dataObject = [...formData].reduce((a, v) => {
		const [key, value] = v
		let matches

		if (matches = key.match(/^[^[\]]+$/)) {
			const [key] = matches
			a[key] = value
		} else if (matches = key.match(/^([^[\]]+)(\[[^[\]]+]*)\[([^[\]]+)]$/)) {
			const [fullMatch, firstKey, immediateKeys, lastKey] = matches
			if (!a.hasOwnProperty(firstKey)) {
				a[firstKey] = {}
			}
			let o = a[firstKey]
			for (let remainImmediateKeys = immediateKeys;
				 matches = remainImmediateKeys.match(/^\[([^[\]]+)]/);
				 remainImmediateKeys =
					 remainImmediateKeys.slice(matches[0].length)) {
				const currentImmediateKey = matches[1]

				if (!o.hasOwnProperty(currentImmediateKey)) {
					o[currentImmediateKey] =
						{}
				}
				o = o[currentImmediateKey]
			}
			o[lastKey] = value
		} else {
			throw new Error('Can\'t parse key')
		}

		return a
	}, {})

	return dataObject
}

function updateData(data = gatherData(), handleResult = false) {
	const promise = postData('update', data, handleResult)

	if (handleResult) {
		promise.then(() => {
			allowPageLeave()
			return location.reload()
		})
	}

	return promise
}

function newQuiz(data = gatherData(), handleResult = false) {
	const promise = postData('new', data, handleResult)

	if (handleResult) {
		promise.then(() => {
			allowPageLeave()
			return window.location = 'index.html'
		})
	}

	return promise
}

function deleteQuiz(handleResult = false) {
	const promise = postData('delete', {}, handleResult)

	if (handleResult) {
		promise.then(() => {
			allowPageLeave()
			return window.location = '../index.html'
		})
	}

	return promise
}

function autoCheck() {
	if (document.querySelector('form').getAttribute('action') === 'check') {
		fs(() => checkForm())
	}
}

function checkForm(force = false) {
	const form = document.querySelector('form')
	// noinspection JSCheckFunctionSignatures
	const formData = new FormData(form)

	fetch('check', {
		method: 'post',
		body: formData,
		cache: 'reload',
		redirect: 'follow',
	})
		.then((response) => response.json())
		.then((response) => {
			response.fails.forEach(({eid, property, message}) => {
				const input = document.querySelector(
					`input[name='entries[${eid}][${property}]']`)
				input.setCustomValidity(message || 'Invalid')
			})
			response.successes.forEach(({eid, property}) => {
				const input = document.querySelector(
					`input[name='entries[${eid}][${property}]']`)
				input.setCustomValidity('')
			})
		})
		.catch((e) => {
			console.error(e)
			if (force) {
				form.submit()
			}
		})
}

function findPositionAndPlace(tr) {
	const tbody = document.querySelector('tbody')
	const order = parseInt(tr.querySelector('input[name$="[order]"]').value || 0)

	while (tr.previousElementSibling &&
	parseInt(tr.previousElementSibling.querySelector('input[name$="[order]"]').value || 0) >
	order) {
		tbody.insertBefore(tr, tr.previousElementSibling)
	}

	while (tr.nextElementSibling &&
	parseInt(tr.nextElementSibling.querySelector('input[name$="[order]"]').value || 0) <
	order) {
		tbody.insertBefore(tr, tr.nextElementSibling.nextElementSibling)
	}
}

function fixOrders() {
	const tbody = document.querySelector('tbody')
	const trs = [...document.querySelectorAll('tr')]

	trs.forEach((tr) => tbody.removeChild(tr))

	const unorderedTrs = trs.filter(
		(tr) => tr.querySelector('input[name$="[order]"]').value === '')
		.sort(() => Math.random() >= shuffleFactor ? 0
			: Math.random() <= 0.5 ? -1 : 1)

	const orderedTrs = trs.filter((tr) => tr.querySelector('input[name$="[order]"]').value !== '')
		.sort((tr_a, tr_b) => {
			const a = parseInt(tr_a.querySelector('input[name$="[order]"]').value)
			const b = parseInt(tr_b.querySelector('input[name$="[order]"]').value)
			return a === b ? 0 : a < b ? -1 : 1
		})

	if (autoOrdering && orderedTrs.length === 0) {
		unorderedTrs.forEach((e, i) => {
			e.querySelector('input[name$="[order]"]').value = i + 1
		})
	}

	unorderedTrs.forEach((tr) => tbody.appendChild(tr))
	orderedTrs.forEach((tr) => tbody.appendChild(tr))
}

// Returns a lambda (tr -> undefined), which pushes the given tr up or down, according to dOrder
// Don't touch or rewrite; it works
function generateCleverPushFunction(dOrder) {
	let next, prev, inc, dec, less, more, eq
	switch (dOrder) {
		case 1:
			next = (tr) => tr.nextElementSibling
			prev = (tr) => tr.previousElementSibling
			inc = (tr) => tr.querySelector('input[name$="[order]"]').value++
			dec = (tr) => tr.querySelector('input[name$="[order]"]').value--
			less = (a, b) => parseInt(a.querySelector('input[name$="[order]"]').value || 0) <
				parseInt(b.querySelector('input[name$="[order]"]').value || 0)
			more = (a, b) => parseInt(a.querySelector('input[name$="[order]"]').value || 0) >
				parseInt(b.querySelector('input[name$="[order]"]').value || 0) + 1
			eq = (a, b) => a.querySelector('input[name$="[order]"]').value ===
				b.querySelector('input[name$="[order]"]').value
			break

		case -1:
			next = (tr) => tr.previousElementSibling
			prev = (tr) => tr.nextElementSibling
			inc = (tr) => tr.querySelector('input[name$="[order]"]').value--
			dec = (tr) => tr.querySelector('input[name$="[order]"]').value++
			less = (a, b) => parseInt(a.querySelector('input[name$="[order]"]').value || 0) >
				parseInt(b.querySelector('input[name$="[order]"]').value || 0)
			more = (a, b) => parseInt(a.querySelector('input[name$="[order]"]').value || 0) <
				parseInt(b.querySelector('input[name$="[order]"]').value || 0) - 1
			eq = (a, b) => a.querySelector('input[name$="[order]"]').value ===
				b.querySelector('input[name$="[order]"]').value
			break

		default:
			throw new RangeError('Only +1 or -1 is supported as dOrder')
	}

	return (tr) => {
		if (prev(tr) && more(tr, prev(tr)) && next(tr) && eq(tr, next(tr))) {
			for (let target = next(tr); target !== null; target = next(target)) {
				if (!eq(tr, target)) {
					break
				}
				dec(target)
			}
		} else if (prev(tr) && eq(tr, prev(tr))) {
			inc(tr)
			for (let target = next(tr); target !== null; target = next(target)) {
				if (!eq(target, prev(target))) {
					break
				}
				inc(target)
			}
		} else {
			inc(tr)
		}
	}
}

function removeTr(tr_or_eid) {
	if (!(tr_or_eid instanceof HTMLElement)) {
		tr_or_eid = document.querySelector(`tr[eid="${CSS.escape(tr_or_eid)}"]`)
	}

	tr_or_eid.parentElement.removeChild(tr_or_eid)
}

function postData(url, data, handleFail = false) {
	const promise = fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
		},
		body: JSON.stringify(data),
	})
		.then((response) => response.json())
		.then((response) => {
			assert(response.ok)
			return response
		})

	promise.then(() => {
		window.remoteData = data
	}, (e) => {
		console.error(e)
	})

	if (handleFail) {
		promise.catch((e) => {
			i18n.alert('messages.postfail', 'Failed to post data', {context: url, error: e})
		})
	}

	return promise
}

function allowPageLeave() {
	if (window.onbeforeunload) {
		const originalOnbeforeunload = window.onbeforeunload
		window.onbeforeunload = function () {
			originalOnbeforeunload.apply(this, arguments)
		}
	}
}

function fs(...fa) {
	let delay = null
	while (fa.length && (typeof fa[0] === 'number' || fa[0] === null)) {
		delay = fa.shift()
	}
	if (fa.length === 0) {
		return
	}

	function cb() {
		if (fa[0]) {
			fa[0]()
		}
		fs(delay, ...fa.slice(1))
	}

	if (delay === null) {
		requestAnimationFrame(cb)
	} else {
		setTimeout(cb, delay)
	}
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message || 'Assertion failed')
	}
}
