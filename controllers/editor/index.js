const Builder = require('./builder')
const express = require('express')
const fs = require('fs')
const http = require('http')
const path = require('path')
const socket = require('socket.io')

const wwwPath = path.resolve(__dirname, 'www')

exports.server = function (openApiDocPath, { buildDirectory = '', componentOptions = {}, port = 8080 } = {}) {
  const app = express()
  const server = http.createServer(app)
  const io = socket(server)
  const builder = exports.build(openApiDocPath, buildDirectory, {
    componentOptions,
    watch: true
  })
  let buildError

  builder.on('build-error', err => {
    buildError = err
    io.emit('build-error', err)
  })

  builder.on('refresh', () => {
    io.emit('refresh')
  })

  app.get('/openapi.json', (req, res) => {
    res.send(builder.openapi)
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

exports.build = function (openApiDocPath, buildDirectory, { componentOptions, watch }) {
  const builder = Builder(openApiDocPath, componentOptions)
  const handlers = { refresh: [], 'build-error': [] }
  let openapi = ''
  let buildError

  if (watch) {
    builder.watch((err, doc) => {
      if (err) {
        buildError = err.toString()
        trigger('build-error', buildError)
      } else {
        openapi = doc
        buildError = false
        trigger('refresh')
        if (buildDirectory) {
          fs.writeFile(path.resolve(buildDirectory, 'openapi.json'), JSON.stringify(openapi, null, 2), err => {
            if (err) console.error(err.stack)
          })
        }
      }
    })
  }

  if (buildDirectory) {
    ensureDirectory(buildDirectory)
      .then(() => copyDir(path.resolve(__dirname, 'build'), buildDirectory))
      .then(() => {
        if (!watch) {
          return new Promise((resolve, reject) => {
            fs.writeFile(path.resolve(buildDirectory, 'openapi.json'), JSON.stringify(openapi, null, 2), err => {
              if (err) return reject(err)
              console.log('Built successfully')
              resolve()
            })
          })
        }
      })
      .catch(err => {
        console.error('Unable to build to directory. ' + buildDirectory)
        console.error(err.stack)
      })
  }

  function trigger (type, ...args) {
    handlers[type].forEach(handler => {
      handler(...args)
    })
  }

  const result = {
    off: (type, handler) => {
      if (handlers[type]) {
        const index = handlers[type].indexOf(handler)
        if (index !== -1) handlers[type].splice(index, 1)
      }
    },

    on: (type, handler) => {
      if (handlers[type]) {
        const index = handlers[type].indexOf(handler)
        if (index === -1) handlers[type].push(handler)
      }
    }
  }

  Object.defineProperty(result, 'openapi', {
    get () { return openapi }
  })

  return result
}

async function ensureDirectory (dirPath) {
  try {
    await stat(dirPath)
  } catch (err) {
    if (err.code === 'ENOENT') {
      await mkdir(dirPath)
    } else {
      throw err
    }
  }
}

function copyFile (source, dest) {
  return new Promise((resolve, reject) => {
    fs.copyFile(source, dest, err => {
      err ? reject(err) : resolve()
    })
  })
}

function mkdir (dirPath) {
  return new Promise((resolve, reject) => {
    fs.mkdir(dirPath, { recursive: true }, err => {
      err ? reject(err) : resolve()
    })
  })
}

async function copyDir (sourcePath, dirPath) {
  const filePath = await readdir(sourcePath)
  const promises = filePath.map(async filePath => {
    const fullPath = path.resolve(sourcePath, filePath)
    const newPath = path.resolve(dirPath, filePath)
    const stats = await stat(fullPath)
    if (stats.isDirectory()) {
      await mkdir(newPath)
      await copyDir(fullPath, newPath)
    } else if (stats.isFile()) {
      await copyFile(fullPath, newPath)
    }
  })
  await Promise.all(promises)
}

function readdir (dirPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, filePaths) => {
      err ? reject(err) : resolve(filePaths)
    })
  })
}

function stat (filePath) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      err ? reject(err) : resolve(stats)
    })
  })
}
