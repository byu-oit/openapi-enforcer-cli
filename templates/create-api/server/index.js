'use strict'
const Enforcer = require('openapi-enforcer')
const EnforcerMiddleware = require('openapi-enforcer-middleware')
const EventEmitter = require('events')
const express = require('express')
const path = require('path')

module.exports = server

function server ({dependencies = {}, mockDependencies = {}, oasDocumentPath, port = 0, shutdown }) {
  // validate input
  if (arguments.length === 0) return Promise.reject(Error('Missing required "options" parameter'))
  if (!arguments[0] || typeof arguments[0] !== 'object') return Promise.reject(Error('Required "options" parameter must be a non null object'))
  const options = Object.assign({}, arguments[0])
  if (options.hasOwnProperty('oasDocumentPath')) return Promise.reject(Error('Missing required option: oasDocumentPath'))

  const emitter = new EventEmitter()
  return new Promise((resolve, reject) => {
    const app = express()
    const enforcer = EnforcerMiddleware(oasDocumentPath)

    // catch unexpected errors loading
    enforcer.promise.catch(errorHandler)

    // check for explicit mock request
    enforcer.mocks(path.resolve(__dirname, '../mocks'), false, mockDependencies)
      .catch(errorHandler)

    // call defined operation handlers
    enforcer.controllers(path.resolve(__dirname, '../controllers'), dependencies)
      .catch(errorHandler)

    // produce fallback mock responses
    enforcer.mocks(path.resolve(__dirname, '../mocks'), true, mockDependencies)
      .catch(errorHandler)

    // tell express to run the open api enforcer middleware
    app.use(enforcer.middleware())

    // add error handling middleware
    app.use((err, req, res, next) => {
      if (process.env.NODE_ENV === 'development') {
        res.status(500)
        res.set('content-type', 'text/plain')
        res.send(err.stack + '\n\nNote that this error message will only reach the client while environment variable NODE_ENV equals "development"')
      } else {
        res.sendStatus(500)
      }
    })

    // start the server listening
    const server = app.listen(port, err => {
      if (err) return reject(err)

      // return
      const result = {
        close () {
          this.end()
        },
        end () {
          server.close()
          emitter.emit('end')
        },
        on (eventType, callback) {
          emitter.on(eventType, callback)
        },
        port: server.address().port
      }
      resolve(result)
    })
  })
}

function errorHandler (err) {
  console.error(err.stack)
  if (process.env.NODE_ENV !== 'development') process.exit(1)
}
