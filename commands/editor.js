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
const server = require('../controllers/editor/server')
const path = require('path')

module.exports = async function (program) {
  program
    .command('editor <oas-doc>')
    .description('View live Redoc UI while editing OpenAPI document')
    .option('-c, --component-options', 'Path to a JSON file that contains the OpenAPI Enforcer component options.')
    .option('-p, --port <key>', 'The port number to serve the API on. Defaults to 8080.')
    .action(async (oasDoc, command) => {
      try {
        const options = {}
        options.port = command.hasOwnProperty('port') ? command.port : 8080
        options.componentOptions = command.hasOwnProperty('componentOptions')
          ? require(path.resolve(process.cwd(), command.componentOptions))
          : {}
        await server(path.resolve(process.cwd(), oasDoc), options)
      } catch (err) {
        console.error(err.message)
        process.exit(1)
      }
    })
}
