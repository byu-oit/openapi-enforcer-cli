/**
 *  @license
 *    Copyright 2019 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict'
const Enforcer = require('openapi-enforcer')
const exec = require('../lib/exec')
const fs = require('../lib/files')
const path = require('path')
const snippet = require('../lib/snippet')
const template = require('../lib/template')

/**
 * Create an API from the starter.
 * @param {string} oasDocPath The directory path to the Open API document.
 * @param {string} outDir The directory to output the starter to.
 * @param {object} options
 * @param {string[]} options.dependencies
 * @param {number,string} options.indent
 * @param {boolean} options.semiColon
 * @param {string} options.xController
 * @param {string} options.xOperation
 * @returns {Promise<void>}
 */
module.exports = async function (oasDocPath, outDir, options = {}) {
  const { dependencies = [], xController = 'x-controller', xOperation = 'x-operation' } = options
  let indent = options.indent === 't' ? '\t' : ' '.repeat(options.indent || 2)
  let semiColon = options.semiColon ? ';' : ''

  const devDependencies = ['chai', 'mocha']
  const promises = []
  dependencies.push('express', 'openapi-enforcer', 'openapi-enforcer-middleware')

  // validate the open api document
  const [openapi, docError] = await Enforcer(oasDocPath, { fullResult: true })
  if (docError) throw Error(docError.toString())

  // ensure that the path is a directory
  const exists = await fs.ensureDirectoryExists(outDir)
  if (!exists) throw Error('A non-directory already exists at the path: ' + outDir)

  // ensure that the directory is empty
  const files = await fs.readdir(outDir)
  if (files.length > 0) throw Error('The directory must be empty: ' + outDir)

  // create the controllers directory
  const controllerDirectoryPath = path.resolve(outDir, 'controllers')
  await fs.ensureDirectoryExists(controllerDirectoryPath)

  // create the mock controllers directory
  const mockControllerDirectoryPath = path.resolve(outDir, 'mocks')
  await fs.ensureDirectoryExists(mockControllerDirectoryPath)

  // create the package json file
  promises.push(fs.writeFile(path.resolve(outDir, 'package.json'), JSON.stringify({
    name: path.basename(outDir),
    version: '0.0.1',
    description: 'An Open API Enforcer API',
    main: 'index.js',
    dependencies: {},
    devDependencies: {},
    scripts: {
      start: 'node index',
      test: 'mocha test'
    },
    keywords: [],
    author: '',
    license: 'Apache-2.0',
    private: true
  }, null, 2)))

  // copy over the oas document
  promises.push(fs.copyFile(oasDocPath, path.resolve(outDir, path.basename(oasDocPath))))

  // generate template files
  promises.push(template('create-api', outDir, { indent, semiColon }, {
    'index.ejs': {
      oasDocName: path.basename(oasDocPath)
    }
  }))

  // create a map for all operations
  const controllersMap = {}
  const rootController = openapi && openapi[xController]
  Object.keys(openapi.paths).forEach(pathKey => {
    const pathItem = openapi.paths[pathKey]
    const pathController = pathItem[xController]
    pathItem.methods.forEach(method => {
      const operation = pathItem && pathItem[method]
      const operationController = operation && operation[xController]
      const controllerName = operationController || pathController || rootController
      const operationName = operation && (operation[xOperation] || operation.operationId)
      if (!controllersMap[controllerName]) controllersMap[controllerName] = []
      controllersMap[controllerName].push(operationName)
    })
  })

  // save controllers to disk
  const controllersFileNames = Object.keys(controllersMap)
  controllersFileNames.sort()
  const controllersPromises = controllersFileNames.map(async controllerName => {
    const operationNames = controllersMap[controllerName]
    operationNames.sort()

    const content = await snippet('oas-controller', { indent, semiColon }, {
      dependencies: '{}',
      operations: operationNames
    })

    const mockContent = await snippet('oas-mock-controller', { indent, semiColon }, {
      dependencies: '{}',
      operations: operationNames
    })

    const controllerFilePath = path.resolve(controllerDirectoryPath, controllerName + '.js')
    const mockControllerFilePath = path.resolve(mockControllerDirectoryPath, controllerName + '.js')
    return Promise.all([
      fs.writeFile(controllerFilePath, content),
      fs.writeFile(mockControllerFilePath, mockContent)
    ])
  })
  promises.push(Promise.all(controllersPromises))

  await Promise.all(promises)

  await exec('npm install ' + dependencies.map(getDependencyKey).join(' '), outDir)
  await exec('npm install --save-dev ' + devDependencies.map(getDependencyKey).join(' '), outDir)
  await exec('npm audit fix', outDir)
}

function getDependencyKey (dependency) {
  switch (dependency.toLowerCase()) {
    case 'chai': return 'chai@4'
    case 'express': return 'express@4'
    case 'mocha': return 'mocha@6'
    case 'openapi-enforcer': return 'openapi-enforcer@1'
    case 'openapi-enforcer-middleware': return 'openapi-enforcer-middleware@1'
    default:
      throw Error('Invalid dependency specified: ' + dependency)
  }
}
