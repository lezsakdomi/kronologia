document.addEventListener('DOMContentLoaded', () => {
	try {
		document.querySelectorAll('input[type=number][name$="[order]"]')
			.forEach(input => {
				const td = input.parentElement
				const tr = td.parentElement

				input.addEventListener('change', (() => {
					document.querySelectorAll('input[type=number][name$="[order]"]')
						.forEach(input => {
							const tr = input.parentElement.parentElement
							tr.style.transition = 'none'
							tr.style.position = 'inherit'
							tr.lastOffsetTop = tr.offsetTop
						})
					tr.style.order = input.value
					document.querySelectorAll('input[type=number][name$="[order]"]')
						.forEach(input => {
							const tr = input.parentElement.parentElement
							tr.nextOffsetTop = tr.offsetTop
							tr.style.top = tr.lastOffsetTop - tr.nextOffsetTop + 'px'
							tr.style.position = 'relative'
							fs(null, false, () => tr.style.transition = null,
								() => tr.style.top = '0px')
						})
				}))
				if (input.value !== '') tr.style.order = input.value
			})
	} catch (e) {
		console.error(e)
	}

	try {
		//TODO make not redundant
		document.querySelectorAll('.down')
			.forEach(div => {
				const td = div.parentElement
				const orderInput = td.querySelector('input[type=number][name$="[order]"]')

				div.addEventListener('click', () => {
					orderInput.value++
					orderInput.dispatchEvent(new Event('change'))
				})
			})
		document.querySelectorAll('.up')
			.forEach(div => {
				const td = div.parentElement
				const orderInput = td.querySelector('input[type=number][name$="[order]"]')

				div.addEventListener('click', () => {
					orderInput.value--
					orderInput.dispatchEvent(new Event('change'))
				})
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
})

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