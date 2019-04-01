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
const inquirer = require('inquirer')
const path = require('path')

const allowedDependencies = ['axios', 'mongodb', 'mysql', 'oracledb', 'postgres', 'request']

module.exports = async function (program) {
  program
    .command('create-api <oas-doc> <out-dir>')
    .description('Create a project')
    .option('-c, --controller <key>', 'The x-controller property name. Defaults to x-controller.')
    .option('-d, --dependencies <types>', 'The optional dependencies to initialize with. Use comma separated values to specify more than one. Valid values include: ' + allowedDependencies.join(', '))
    .option('-i, --indent <value>', 'The code style of the number of spaces of indentation to use. Specify a number or "t" for tab. Defaults to 2.')
    .option('-s, --semi-colon', 'Set this flag to use the code style of unnecessary semi-colons to your JavaScript')
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
        const prompt = {
          controller: {
            message: 'What is the value of your x-controller property in your Open API document',
            type: 'input',
            name: 'controller',
            default: 'x-controller',
            validate: validateNonEmpty
          },
          dependencies: {
            message: 'Select the dependencies you want added to your API',
            type: 'checkbox',
            name: 'dependencies',
            default: [],
            choices: [
              { name: 'Axios', value: 'axios' },
              { name: 'MongoDB', value: 'mongodb' },
              { name: 'MySQL', value: 'mysql' },
              { name: 'OracleDB', value: 'oracledb' },
              { name: 'PostgreSQL', value: 'postgres' },
              { name: 'Request', value: 'request' }
            ],
            parseCliInput (value) {
              const array = value.split(',')
              array.forEach(v => {
                const index = this.choices.findIndex(o => o.value === v)
                if (index === -1) {
                  console.error('Invalid dependency specified: ' + v + '. Must be one of: ' + allowedDependencies.join(', '))
                  process.exit(1)
                }
              })
              return array
            }
          },
          indent: {
            message: 'The indentation style to use',
            type: 'list',
            name: 'indent',
            default: 0,
            choices: [
              { name: '2 spaces', value: 2 },
              { name: '4 spaces', value: 4 },
              { name: '1 tab', value: 't' }
            ],
            cliDefault: 2
          },
          semiColon: {
            message: 'Use optional JavaScript semicolons',
            type: 'confirm',
            name: 'semiColon',
            default: false
          },
          operation: {
            message: 'What is the value of your x-operation property in your Open API document',
            type: 'input',
            name: 'controller',
            default: 'x-operation',
            validate: validateNonEmpty
          }
        }

        // populate prompts and options values
        const prompts = []
        const options = {}
        Object.keys(prompt).forEach(key => {
          const p = prompt[key]
          if (command.hasOwnProperty(key)) {
            options[key] = p.parseCliInput ? p.parseCliInput(command[key]) : command[key]
          } else if (command.Y) {
            options[key] = p.hasOwnProperty('cliDefault') ? p.cliDefault : p.default
          } else {
            prompts.push(prompt[key])
          }
        })

        // if prompts should be shown then show now
        if (!command.Y) {
          const answers = await inquirer.prompt(prompts)
          Object.assign(options, answers)
        }

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
          semiColon: options.semiColon,
          xController: options.controller,
          xOperation: options.operation
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

function validateNonEmpty (value) {
  return value.length === 0
    ? 'Non empty string required'
    : true
}
