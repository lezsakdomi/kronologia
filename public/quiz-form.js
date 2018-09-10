if (shuffleFactor === undefined) {
	shuffleFactor = 1
}

if (autoOrdering === undefined) {
	autoOrdering = true
}

if (locale === undefined) {
	locale = "en"
}

document.addEventListener('DOMContentLoaded', () => registerHandlers(document))

window.onbeforeunload = () => {
	if (!window.remoteData) return // No initialization yet

	if (JSON.stringify(gatherData()) !== JSON.stringify(window.remoteData)) {
		return "Nothing were saved. Are you sure?"
	}
}

document.addEventListener('DOMContentLoaded', () => {
	fixOrders()
	window.remoteData = gatherData()
})

function registerHandlers(document) {
	handleEvent('input[name$="[order]"]', 'change', ({target: orderInput}) => {
		const tr = orderInput.parentElement.parentElement

		reorderStart()
		findPositionAndPlace(tr)
		reorderEnd()
	}, true)

	Object.entries({
		".down": generateCleverPushFunction(1),
		".up": generateCleverPushFunction(-1),
		".remove": removeTr,
	}).forEach(([selector, dOrder]) => {
		customClick(selector, ({target: button}) => {
			const tr = button.parentElement.parentElement
			const orderInput = tr.querySelector('input[name$="[order]"]')

			reorderStart()
			dOrder(tr)
			findPositionAndPlace(tr)
			reorderEnd()
		}, true)
	})

	customClick('form[action="check"] input[type=submit]', () => checkForm(true), false)

	handleEvent('#showBg', 'change', ({target: checkbox}) => {
		const tbody = document.querySelector('tbody')

		if (checkbox.checked) {
			tbody.classList.add('show-bg')
		} else {
			tbody.classList.remove('show-bg')
		}
	}, false, true)

	customClick('button#add', () => {
		const tbody = document.querySelector('tbody')

		let eid = 0
		while (document.querySelector('tr[eid="' + eid + '"]')) eid++
		const order = [...document.querySelectorAll('input[name$="[order]"]')]
				.map(input => parseInt(input.value || 0))
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
		registerHandlers(tbody.lastChild)
		document.querySelector('input[name="entries[' + eid + '][question]"]').focus()
	}, false)

	customClick('#sort', () => {
		const tbody = document.querySelector('tbody')

		reorderStart()
		const trs = [...document.querySelectorAll('tr')]
			.filter(tr => tr.querySelector('input[name$="[answer]"]').value !== '')
			.sort((tr_a, tr_b) => {
				// Just checking in alphabetical order
				const a = tr_a.querySelector('input[name$="[answer]"]').value
				const b = tr_b.querySelector('input[name$="[answer]"]').value
				return a.localeCompare(b, locale, {ignorePunctuation: true}, 'sort')
			})
		trs.forEach((tr, i) => tr.querySelector('input[name$="[order]"]').value = i + 1)
		trs.forEach(tr => tbody.removeChild(tr))
		trs.forEach(tr => tbody.appendChild(tr))
		reorderEnd()
	}, false)

	customClick('#renumber', () => {
		const data = gatherData()

		if (data.entries) {
			data.entries = Object.values(data.entries)
				.sort((a, b) => a.order.localeCompare(b.order, locale, {numeric: true}))
		} else {
			console.warn("dataObject.entries is empty!", data)
		}

		updateData(data, true)
	}, false)

	customClick('form[action="update"] input[type=submit]', () => updateData(), false)

	function customClick(selector, handler, required = true) {
		handleEvent(selector, 'click', function (evt) {
			try {
				handler.apply(this, arguments)
			} finally {
				evt.preventDefault()
			}
		}, required)
	}

	function handleEvent(selector, event, handler, required = true, fireNow = false) {
		const elements = document.querySelectorAll(selector)
		elements.forEach(e => e.addEventListener(event, handler))

		if (elements.length === 0) {
			if (required) {
				console.warn("Could not find " + selector)
			} else {
				console.info(selector + " not present")
			}
		} else {
			console.debug("Handler registered for " + selector, elements, handler)
		}

		if (fireNow) {
			elements.forEach(element => {
				try {
					handler.call(this, {
						type: event,
						target: element,
					})
				} catch (e) {
					console.error(e)
				}
			})
			console.debug("Mock event for " + selector + " dispatched", elements, handler)
		}
	}
}

// SlipJS integration
document.addEventListener('DOMContentLoaded', () => {
	const tbody = document.querySelector('tbody')

	new Slip(tbody)

	tbody.addEventListener('slip:beforewait', evt => {
		const {target} = evt
		if (target.classList.contains('question')) evt.preventDefault()
	})

	tbody.addEventListener('slip:beforereorder', evt => {
		let tr = evt.target
		while (tr.tagName !== 'TR') tr = tr.parentElement

		tr.lastSlipBeforeReorder = evt
	})

	tbody.addEventListener('slip:reorder', evt => {
		const {target: tr, detail: {insertBefore}} = evt
		const orderInput = tr.querySelector('input[name$="[order]"]')
		const startTime = new Date(tr.lastSlipBeforeReorder.timeStamp)
		const endTime = new Date(evt.timeStamp)

		tr.style.transform = null

		if (tr.nextElementSibling === insertBefore) {
			if (endTime - startTime < 200) { // Just touched
				if (orderInput.value === '') {
					orderInput.value = parseInt(document.querySelector(
						'tr:last-child input[name$="[order]"]'
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
						.map(input => parseInt(input.value || 0))
						.reduce((a, v) => Math.max(a, v), 0)
					+ 1
			} else if (tr.previousElementSibling === null || tr.previousElementSibling
				.querySelector('input[name$="[order]"]').value === '') {
				if (tr.nextElementSibling && tr.nextElementSibling
					.querySelector('input[name$="[order]"]').value === '') {
					// noop; let the users to freely organise their stuff
				} else {
					const shift = insertBefore.querySelector('input[name$="[order]"]').value - 2

					document.querySelectorAll('input[name$="[order]"]:not(:placeholder-shown)')
						.forEach(orderInput => orderInput.value -= shift)

					orderInput.value = 1
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
				if (tr.lastOffsetTop !== tr.nextOffsetTop) console.warn("Reorder was needed")
			}
		}
	})
})

function reorderStart(trs = document.querySelectorAll('tr')) {
	if (trs instanceof HTMLElement) trs = arguments
	for (tr of trs) {
		tr.style.transition = 'none'
		tr.lastOffsetTop = tr.offsetTop
	}
}

function reorderEnd(trs = document.querySelectorAll('tr')) {
	if (trs instanceof HTMLElement) trs = arguments
	trs.forEach(tr => {
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
			if (!a.hasOwnProperty(firstKey)) a[firstKey] = {}
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
			throw new Error("Can't parse key")
		}

		return a
	}, {})

	return dataObject
}

function updateData(data = gatherData(), reload = false) {
	const promise = fetch("update", {
		method: "POST",
		headers: {
			"Content-Type": "application/json; charset=utf-8"
		},
		body: JSON.stringify(data),
	})
		.then(response => response.json())
		.then(response => {
			assert(response.ok)
			return response
		})

	promise.then(() => {
		window.remoteData = data
	}, e => {
		console.error(e)
		if (reload) alert("Failed to save data")
	})

	if (reload) {
		promise.then(() => {
			if (window.onbeforeunload) {
				const originalOnbeforeunload = window.onbeforeunload
				window.onbeforeunload = function () {
					originalOnbeforeunload.apply(this, arguments)
				}
			}
			return location.reload()
		})
	}
}

function checkForm(force = false) {
	const form = document.querySelector('form')
	// noinspection JSCheckFunctionSignatures
	const formData = new FormData(form)

	fetch(form.action, {
		method: form.method,
		body: formData,
		cache: 'reload',
		redirect: 'follow',
	})
		.then(response => response.json())
		.then(response => {
			response.fails.forEach(({eid, property, message}) => {
				const input = document.querySelector(
					`input[name='entries[${eid}][${property}]']`)
				input.setCustomValidity(message || "Invalid")
			})
			response.successes.forEach(({eid, property}) => {
				const input = document.querySelector(
					`input[name='entries[${eid}][${property}]']`)
				input.setCustomValidity("")
			})
		})
		.catch(e => {
			console.error(e)
			if (force) form.submit()
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

	trs.forEach(tr => tbody.removeChild(tr))

	const unorderedTrs = trs.filter(
		tr => tr.querySelector('input[name$="[order]"]').value === '')
		.sort(() => Math.random() >= shuffleFactor ? 0
			: Math.random() <= 0.5 ? -1 : 1)

	const orderedTrs = trs.filter(tr => tr.querySelector('input[name$="[order]"]').value !== '')
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

	unorderedTrs.forEach(tr => tbody.appendChild(tr))
	orderedTrs.forEach(tr => tbody.appendChild(tr))
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
			throw new RangeError("Only +1 or -1 is supported as dOrder")
	}

	return (tr) => {
		if (prev(tr) && more(tr, prev(tr)) && next(tr) && eq(tr, next(tr))) {
			for (let target = next(tr); target !== null; target = next(target)) {
				if (!eq(tr, target)) break
				dec(target)
			}
		} else if (prev(tr) && eq(tr, prev(tr))) {
			inc(tr)
			for (let target = next(tr); target !== null; target = next(target)) {
				if (!eq(target, prev(target))) break
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

function fs(...fa) {
	let delay = null
	while (fa.length && (typeof fa[0] === 'number' || fa[0] === null)) {
		delay = fa.shift()
	}
	if (fa.length === 0) return

	function cb() {
		if (fa[0]) fa[0]()
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
		throw new Error(message || "Assertion failed")
	}
}
