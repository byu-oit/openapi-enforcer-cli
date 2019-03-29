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
const fs = require('./files')
const ejs = require('ejs')
const { EOL } = require('os')
const path = require('path')

module.exports = async function (snippetNameOrPath, { indent = '  ', semiColon = false }, data) {
  const fullPath = snippetNameOrPath.split(path.sep).length > 1
    ? snippetNameOrPath
    : path.resolve(__dirname, '..', 'snippets', snippetNameOrPath + '.ejs')
  const snippet = await fs.readFile(fullPath, 'utf8')
  let render = ejs.render(snippet, Object.assign({}, data, { semiColon }))
  render = render.replace(new RegExp('^\\s*' + EOL, 'mg'), EOL)
  render = render.replace(/(?: {4}|\t)/g, indent)
  return render
}
