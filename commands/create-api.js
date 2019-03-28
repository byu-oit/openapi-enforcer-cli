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
const path = require('path')

const allowedDependencies = ['axios', 'mongodb', 'mysql', 'oracle', 'postgres', 'request']

module.exports = async function (program) {
  program
    .command('create-api <oas-doc> <out-dir>')
    .description('Create a project')
    .option('-c, --controller <key>', 'The x-controller property name. Defaults to x-controller.')
    .option('-d, --dependencies <types>', 'The optional dependencies to initialize with. Use comma separated values to specify more than one. Valid values include: ' + allowedDependencies.join(', '))
    .option('-i, --indent <value>', 'The code style of indent value to use. Defaults to two spaces.')
    .option('-s, --semi-colon', 'Set this flag to use the code style of unnecessary semi-colons to your JavaScript')
    .option('-o, --operation <key>', 'The x-operation property name. Defaults to x-operation.')
    .action(async (oasDoc, outDir, command) => {
      try {
        outDir = path.resolve(process.cwd(), outDir)

        const fullPath = path.resolve(process.cwd(), oasDoc)
        const [def, docError] = await Enforcer(fullPath, { fullResult: true })
        if (docError) {
          console.error(docError.toString())
          process.exit(1)
        }

        const missingIndicators = findMissingIndicators(def, {
          xController: command.controller || 'x-controller',
          xOperation: command.operation || 'x-operation'
        })
        if (missingIndicators.length) {
          console.error('\nYour Open API document must specify x-controller and x-operation (or operationId) fields for each path item operation. Please refer to the documentation at https://github.com/byu-oit/openapi-enforcer-middleware/blob/master/docs/controllers.md for more information.\n')
          missingIndicators.forEach(item => {
            console.error(item.operation + '\n  Missing: ' + item.missing + '\n')
          })
          process.exit(1)
        }

        if (command.dependencies) {
          command.dependencies.split(',').forEach(name => {
            if (allowedDependencies.indexOf(name) === -1) {
              console.error('Invalid database specified: ' + name + '. Must be one of: ' + allowedDependencies.join(', '))
              process.exit(1)
            }
          })
        }

        await createApi(oasDoc, outDir, {
          dependencies: command.dependencies,
          indent: command.indent || '  ',
          semiColon: command.semiColon ? ';' : '',
          xController: command.controller || 'x-controller',
          xOperation: command.operation || 'x-operation'
        })

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
