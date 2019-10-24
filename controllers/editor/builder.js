const chokidar = require('chokidar')
const fs = require('fs')
const Enforcer = require('openapi-enforcer')
const RefParser = require('json-schema-ref-parser')

module.exports = Builder

function Builder (source, componentOptions) {
  const factory = {}
  const rxRemotePath = /^https?:\/\//
  const watchedFiles = {}
  let cache
  let debounceTimeoutId
  let watcher

  factory.build = async function () {
    console.log('\n--- BUILDING ' + (new Date()).toLocaleString() + ' ---\n')

    const openApiDoc = await RefParser.bundle(source)
    const [ , err, warn ] = await Enforcer(openApiDoc, {
      fullResult: true,
      componentOptions
    })
    if (err) {
      console.log(err.toString())
      console.log('\nBuild failed\n')
      throw err
    } else {
      if (warn) console.log(warn.toString())
      cache = openApiDoc
      console.log('\nBuilt successfully\n')
      return cache
    }
  }

  factory.getLocalRefPaths = async function () {
    const paths = await factory.getRefPaths()
    return paths.filter(path => !rxRemotePath.test(path))
  }

  factory.getRefPaths = async function () {
    const parser = new RefParser()
    await parser.dereference(source, source)
    return parser.$refs.paths()
  }

  factory.unwatch = function () {
    if (watcher) {
      Object.keys(watchedFiles)
        .forEach(filePath => {
          watchedFiles[filePath] = false
          watcher.unwatch(filePath)
        })
      watcher.close()
      watcher = undefined
    }
  }

  factory.watch = async function (handler) {
    let skipNext = false

    if (!watcher) watcher = chokidar.watch([source])

    try {
      await updateWatchedPaths()
      const result = await factory.build()
      if (handler) handler(null, result)
    } catch (err) {}

    watcher.on('all', (event, filePath) => {
      switch (event) {
        case 'add':
        case 'change':
        case 'unlink':
          cache = false
          debounce(async () => {
            if (!skipNext) {
              try {
                skipNext = await updateWatchedPaths()
                const result = await factory.build()
                if (handler) handler(null, result)
              } catch (err) {
                if (handler) handler(err, null)
              }
            }
          }, 300)
      }
    })
  }

  Object.defineProperty(factory, 'openapiDoc', {
    get () {
      return cache
    }
  })

  ;(function () {
    let error
    try {
      const stats = fs.statSync(source)
      if (!stats.isFile()) error = Error('Please specify the root OpenAPI document file. The path specified is not a file: ' + source)
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn('\n!! WARNING: The OpenAPI document specified does not exist yet. Please create it to use the editor UI.\n')
      } else {
        error = err
      }
    }
    if (error) throw error
  })()

  return factory

  /**
   * Call the provided callback function with a debounce of the specified delay amount.
   * @param {function} callback
   * @param {number} delay
   */
  function debounce (callback, delay) {
    clearTimeout(debounceTimeoutId)
    debounceTimeoutId = setTimeout(callback, delay)
  }

  async function updateWatchedPaths () {
    const filesToWatch = await factory.getLocalRefPaths()
    let additions = false

    // remove files that should no longer be watched
    Object.keys(watchedFiles)
      .filter(filePath => !filesToWatch.includes(filePath))
      .forEach(filePath => {
        watchedFiles[filePath] = false
        watcher.unwatch(filePath)
        console.log('Stopped watching ' + filePath)
      })

    // add new files that should be watched
    filesToWatch.forEach(filePath => {
      if (!watchedFiles[filePath]) {
        watchedFiles[filePath] = true
        watcher.add(filePath)
        console.log('Started watching ' + filePath)
        additions = true
      }
    })

    return additions
  }
}
