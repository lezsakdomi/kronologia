document.addEventListener('DOMContentLoaded', () => {
	const tbody = document.querySelector('tbody')

	function findPositionAndPlace(tr) {
		const order = tr.querySelector('input[name$="[order]"]').value

		while (tr.previousElementSibling &&
		tr.previousElementSibling.querySelector('input[name$="[order]"]').value > order) {
			tbody.insertBefore(tr, tr.previousElementSibling)
		}

		while (tr.nextElementSibling &&
		tr.nextElementSibling.querySelector('input[name$="[order]"]').value < order) {
			tbody.insertBefore(tr, tr.nextElementSibling.nextElementSibling)
		}
	}

	// Fix orders
	try {
		let trs = [...document.querySelectorAll('tr')]
		trs = trs.sort((tr_a, tr_b) => {
			const a = parseInt(tr_a.querySelector('input[name$="[order]"]').value)
			const b = parseInt(tr_b.querySelector('input[name$="[order]"]').value)
			return a === b ? 0 : a < b ? -1 : 1
		})
		trs.forEach(tr => tbody.removeChild(tr))
		trs.forEach(tr => tbody.appendChild(tr))
	} catch (e) {
		console.error(e)
	}

	// Handle manual order set
	try {
		document.querySelectorAll('input[name$="[order]"]').forEach(orderInput => {
			orderInput.addEventListener('change', (evt) => {
				reorderStart()
				findPositionAndPlace(evt.target.parentElement.parentElement)
				reorderEnd()
			})
		})
	} catch (e) {
		console.error(e)
	}

	// Handle positioning buttons
	try {
		const buttonBehavior = {
			".down": generateCleverPushFunction(1),
			".up": generateCleverPushFunction(-1),
		}

		Object.entries(buttonBehavior).forEach(([selector, dOrder]) => {
			const matchingElements = document.querySelectorAll(selector)
			for (let i = 0; i < matchingElements.length; i++) {
				const button = matchingElements[i]
				const td = button.parentElement
				const tr = td.parentElement
				const orderInput = tr.querySelector('input[name$="[order]"]')

				button.addEventListener('click', () => {
					reorderStart()
					if (dOrder instanceof Function) {
						dOrder(tr)
					} else {
						orderInput.value = parseInt(orderInput.value || 0) + dOrder
					}
					findPositionAndPlace(tr)
					reorderEnd()
				})
			}
		})
	} catch (e) {
		console.error(e)
	}

	try {
		const submit = document.querySelector('input[type=submit][value=check]')
		submit.addEventListener('click', (evt) => {
			const form = submit.parentElement
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
					form.submit()
				})

			evt.preventDefault()
		})
	} catch (e) {
		console.error(e)
	}

	try {
		new Slip(tbody)

		tbody.addEventListener('slip:beforewait', evt => {
			const {target} = evt
			if (target.tagName === "TD") evt.preventDefault()
		})

		tbody.addEventListener('slip:reorder', evt => {
			const {target: tr, detail: {insertBefore}} = evt
			tbody.insertBefore(tr, insertBefore)
			const orderInput = tr.querySelector('input[name$="[order]"]')

			if (insertBefore) {
				orderInput.value = insertBefore.querySelector('input[name$="[order]"]').value
			} else {
				orderInput.value = [...document.querySelectorAll('input[name$="[order]"]')]
						.map(input => input.value)
						.reduce((a, v) => Math.max(a, v), 0)
					+ 1
			}
		})
	} catch (e) {
		console.error(e)
	}
})

function reorderStart(trs = document.querySelectorAll('tr')) {
	if (trs instanceof HTMLElement) trs = arguments
	for (tr of trs) {
		tr.style.transition = 'none'
		tr.style.position = 'inherit'
		tr.lastOffsetTop = tr.offsetTop
	}
}

function reorderEnd(trs = document.querySelectorAll('tr')) {
	if (trs instanceof HTMLElement) trs = arguments
	trs.forEach(tr => {
		tr.style.transition = 'none'
		tr.style.position = 'inherit'
		tr.nextOffsetTop = tr.offsetTop
		tr.style.top = tr.lastOffsetTop - tr.nextOffsetTop + 'px'
		tr.style.position = 'relative'
		fs(null, () => tr.style.transition = null, () => tr.style.top = '0px')
	})
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