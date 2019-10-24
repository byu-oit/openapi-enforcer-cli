const Builder = require('./builder')
const express = require('express')
const http = require('http')
const path = require('path')
const socket = require('socket.io')

const wwwPath = path.resolve(__dirname, 'www')

module.exports = function (openApiDocPath, { componentOptions = {}, port = 3000 } = {}) {
  const app = express()
  const server = http.createServer(app)
  const io = socket(server)
  const builder = Builder(openApiDocPath, componentOptions)
  let openapi
  let buildError

  builder.watch((err, doc) => {
    if (err) {
      buildError = err.toString()
      io.emit('build-error', buildError)
    } else {
      openapi = doc
      buildError = false
      io.emit('refresh')
    }
  })

  app.get('/openapi.json', (req, res) => {
    res.send(openapi)
  })

  app.use(express.static(wwwPath))

  io.on('connection', socket => {
    if (buildError) socket.emit('build-error', buildError)
    socket.on('disconnect', () => {})
  })

  const listener = server.listen(port, async err => {
    if (err) {
      console.error(err.stack)
    } else {
      const port = listener.address().port
      console.log('=========================\nServer started:\n  http://127.0.0.1:' + port + '\n  http://localhost:' + port + '\n=========================')
    }
  })
}
