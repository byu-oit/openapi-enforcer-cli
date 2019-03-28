const fs = require('fs')
const path = require('path')

module.exports = function commandLoader(program) {
  const commands = {}
  const loadPath = path.dirname(__filename)

  fs.readdirSync(loadPath)
    .filter(filename => /\.js$/.test(filename) && filename !== 'index.js')
    .forEach(filename => {
      const name = filename.substr(0, filename.lastIndexOf('.'))
      const command = require(path.join(loadPath, filename))
      commands[name] = command(program)
  })

  return commands
}
