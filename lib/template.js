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
const debug = require('debug')('enforcer-cli')
const fs = require('./files')
const path = require('path')
const snippet = require('./snippet')

module.exports = function (templateName, outDir, options, data) {
  debug('producing template ' + templateName + ' into ' + outDir)
  const templatePath = path.resolve(__dirname, '..', 'templates', templateName)
  return templateDirectory(templatePath, templatePath, outDir, options, data)
}

async function templateDirectory (root, source, target, options, data) {
  debug('scanning template directory: ' + source)
  const files = await fs.readdir(source)
  const promises = []
  files.forEach(file => {
    const sourceFullPath = path.resolve(source, file)
    const targetFullPath = path.resolve(target, file)
    const promise = fs.stat(sourceFullPath)
      .then(stats => {
        if (stats.isDirectory()) {
          return templateDirectory(root, sourceFullPath, targetFullPath, options, data)
        } else if (stats.isFile()) {
          const extname = path.extname(file)
          if (extname === '.ejs') {
            debug('running template parser on file: ' + sourceFullPath)
            const relPath = path.relative(root, sourceFullPath)
            const modifiedFileName = path.basename(file, extname) + '.js'
            return templateFile(sourceFullPath, path.resolve(target, modifiedFileName), options, data[relPath] || {})
          } else {
            debug('copying file: ' + sourceFullPath)
            return fs.ensureDirectoryExists(path.dirname(targetFullPath))
              .then(() => fs.copyFile(sourceFullPath, targetFullPath))
          }
        }
      })
    promises.push(promise)
  })
  return Promise.all(promises)
}

async function templateFile (source, target, options, data) {
  const render = await snippet(source, options, data)
  await fs.ensureDirectoryExists(path.dirname(target))
  return fs.writeFile(target, render)
}
