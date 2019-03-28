/**
 *  @license
 *    Copyright 2018 Brigham Young University
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
const { shell } = require('execa')

module.exports = async function (command, cwd) {
  const child = shell(command, { cwd, stdio: [ 0, 1, 2 ], timeout: 0 })
  const { code, failed } = await child

  if (code !== 0) {
    console.error('Command terminated with a non-zero status code.')
    console.error('Command: ' + command)
    process.exit(code)
  }
  if (failed) {
    console.error('Command failed: ' + command)
    process.exit(1)
  }
}
