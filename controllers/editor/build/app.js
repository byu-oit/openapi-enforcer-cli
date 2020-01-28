(function () {
  const options = {
    sortPropsAlphabetically: true,
    pathInMiddlePanel: true,
    requiredPropsFirst: true
  }
  Redoc.init('./openapi.json', options, document.querySelector('#redoc'))
})()
