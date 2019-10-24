(function () {
  const socket = io()
  const errorEl = document.querySelector('#error')
  const errorMessage = document.querySelector('#error-message')
  let container = document.querySelector('#redoc')

  socket.on('build-error', err => {
    reportError(err)
  })

  socket.on('refresh', () => {
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    container.className = 'fade'
    const oldContainer = container

    container = document.createElement('div')
    container.setAttribute('id', 'redoc')
    container.className = 'fade'
    document.body.appendChild(container)

    errorEl.className = ''
    errorMessage.innerText = ''
    setTimeout(() => init(oldContainer, scrollX, scrollY), 0)
  })

  function hasClass (el, className) {
    const classes = el.className.split(/ /)
    return classes.includes(className)
  }

  function init (previous = null, scrollX = 0, scrollY = 0) {
    const options = {
      sortPropsAlphabetically: true,
      pathInMiddlePanel: true,
      requiredPropsFirst: true
    }
    Redoc.init('./openapi.json', options, container, () => {
      if (previous) {
        document.body.removeChild(previous)
        container.className = ''
        window.scrollTo(scrollX, scrollY)
      }
    })
  }

  function reportError(message) {
    errorEl.className = 'hint'
    errorMessage.innerText = message
    setTimeout(() => {
      if (hasClass(errorEl, 'hint')) {
        toggleClass(errorEl, 'bounce', true)
      }
    }, 250)
  }

  function toggleClass(el, className, set) {
    const classes = el.className.split(/ /)
    const index = classes.indexOf(className)
    if (arguments.length > 2) {
      if (set && index === -1) {
        classes.push(className)
      } else if (!set && index !== -1) {
        classes.splice(index, 1)
      }
    } else if (index === -1) {
      classes.push(className)
    } else {
      classes.splice(index, 1)
    }
    el.className = classes.join(' ')
  }

  errorEl.querySelector('.tab').addEventListener('click', e => {
    e.stopPropagation()
    if (hasClass(errorEl, 'hint')) {
      errorEl.className = 'hint'
      setTimeout(() => errorEl.className = 'show')
    } else if (hasClass(errorEl, 'show')) {
      errorEl.className = 'hint'
    }
  })

  document.body.addEventListener('click', () => {
    if (errorEl.className === 'show') errorEl.className = 'hint'
  })

  init()
})()
