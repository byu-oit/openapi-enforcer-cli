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
const path = require('path')

module.exports = function (program) {
  program
    .command('validate <oas-doc>')
    .description('Validate an Open API Specification document')
    .action((oasDoc) => {
      const fullPath = path.resolve(process.cwd(), oasDoc)
      Enforcer(fullPath, { fullResult: true })
        .then(result => {
          if (result.error) {
            console.error(result.error.toString())
          } else if (result.warning) {
            console.log('\nDocument is valid but has one or more warnings.\n')
            console.log(result.warning.toString())
          } else {
            console.log('\nDocument is valid')
          }
        })
        .catch(err => {
          console.log('\n' + err.message)
        })
    })
}
