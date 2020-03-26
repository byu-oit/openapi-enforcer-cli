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
const editor = require('../controllers/editor/index')
const path = require('path')

module.exports = async function (program) {
  program
    .command('docs-dev <oas-doc>')
    .description('Produce documentation with Redoc UI while editing an OpenAPI document')
    .option('-b, --build-directory <path>', 'A directory to output a build of your documentation to. If omitted a directory will not be written to.')
    .option('-c, --component-options <path>', 'Path to a JSON file that contains the OpenAPI Enforcer component options.')
    .option('-p, --port <key>', 'The port number to serve the API on. Defaults to 8080.')
    .action(async (oasDoc, command) => {
      try {
        const options = {}
        if (command.hasOwnProperty('buildDirectory')) options.buildDirectory = path.resolve(process.cwd(), command.buildDirectory)
        options.port = command.hasOwnProperty('port') ? command.port : 8080
        options.componentOptions = command.hasOwnProperty('componentOptions')
          ? require(path.resolve(process.cwd(), command.componentOptions))
          : {}
        await editor.server(path.resolve(process.cwd(), oasDoc), options)
      } catch (err) {
        console.error(err.message)
        process.exit(1)
      }
    })

  program
    .command('docs-build <oas-doc> <out-dir>')
    .description('Produce documentation with Redoc UI')
    .option('-c, --component-options <path>', 'Path to a JSON file that contains the OpenAPI Enforcer component options.')
    .option('-w, --watch', 'Watch the OpenAPI document for changes and auto rebuild')
    .action(async (oasDoc, outDir, command) => {
      try {
        const options = {}
        options.componentOptions = command.hasOwnProperty('componentOptions')
          ? require(path.resolve(process.cwd(), command.componentOptions))
          : {}
        if (command.hasOwnProperty('watch')) options.watch = true;
        await editor.build(path.resolve(process.cwd(), oasDoc), path.resolve(process.cwd(), outDir), options)
      } catch (err) {
        console.error(err.message)
        process.exit(1)
      }
    })
}
