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
const createApi = require('../controllers/create-api')
const Enforcer = require('openapi-enforcer')
const files = require('../lib/files')
const path = require('path')

module.exports = async function (program) {
  program
    .command('create-api <oas-doc> <out-dir>')
    .description('Create a project')
    .option('-c, --controller <key>', 'The x-controller property name. Defaults to x-controller.')
    .option('-i, --indent <value>', 'The code style of the number of spaces of indentation to use. Specify a number of spaces or "t" for tab. Defaults to 2.')
    .option('-s, --no-semi-colon', 'Set this flag to use the code style of removing unnecessary semi-colons to your JavaScript.')
    .option('-o, --operation <key>', 'The x-operation property name. Defaults to x-operation.')
    .option('-y', 'Use defaults instead of showing interactive options')
    .action(async (oasDoc, outDir, command) => {
      try {
        // validate the out directory is empty
        outDir = path.resolve(process.cwd(), outDir)
        await files.ensureDirectoryEmptyOrMissing(outDir)

        // validate the OAS document
        const fullPath = path.resolve(process.cwd(), oasDoc)
        const [def, docError] = await Enforcer(fullPath, { fullResult: true })
        if (docError) {
          console.error(docError.toString())
          process.exit(1)
        }

        // establish defaults
        const inputs = {
          controller: 'x-controller',
          indent: 2,
          noSemiColon: false,
          operation: 'x-operation'
        }

        // populate options values
        const options = {}
        Object.keys(inputs).forEach(key => {
          if (command.hasOwnProperty(key)) {
            options[key] = command[key]
          } else {
            options[key] = inputs[key]
          }
        })

        // check the open api document for missing x-controller or x-operation properties
        const missingIndicators = findMissingIndicators(def, { xController: options.controller, xOperation: options.operation })
        if (missingIndicators.length) {
          console.error('\nYour Open API document must specify ' + options.controller + ' and ' +
            options.operation + ' (or operationId) fields for each path item operation. ' +
            ' Please refer to the documentation at https://github.com/byu-oit/openapi-enforcer-middleware/blob/master/docs/controllers.md for more information.\n')
          missingIndicators.forEach(item => {
            console.error(item.operation + '\n  Missing: ' + item.missing + '\n')
          })
          process.exit(1)
        }

        await createApi(oasDoc, outDir, {
          dependencies: options.dependencies,
          indent: options.indent,
          semiColon: !options.noSemiColon,
          xController: options.controller,
          xOperation: options.operation
        })

        console.log('\n================================================================================\n')
        console.log('API created successfully.')
        console.log('Start your API server with the command: npm start')
        console.log('As is, your API can produce mocked responses, so try hitting your API endpoints.')
        console.log('\n================================================================================\n')
      } catch (err) {
        console.error(err.message)
        process.exit(1)
      }
    })
}

function findMissingIndicators (openapi, { xController, xOperation }) {
  const results = []

  const rootController = openapi && openapi[xController]
  Object.keys(openapi.paths).forEach(pathKey => {
    const pathItem = openapi.paths[pathKey]
    const pathController = pathItem[xController]
    pathItem.methods.forEach(method => {
      const operation = pathItem && pathItem[method]
      const operationController = operation && operation[xController]
      const controllerName = operationController || pathController || rootController
      const operationName = operation && (operation[xOperation] || operation.operationId)

      const missing = []
      if (!controllerName) missing.push(xController)
      if (!operationName) missing.push(xOperation)
      if (missing.length) {
        results.push({
          missing: missing.join(' '),
          operation: method.toUpperCase() + ' ' + pathKey
        })
      }
    })
  })

  return results
}
