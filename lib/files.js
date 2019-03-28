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
const fs = require('fs')
const { promisify } = require('util')

const files = {
  copyFile: promisify(fs.copyFile),
  ensureDirectoryExists,
  mkdir: promisify(fs.mkdir),
  readdir: promisify(fs.readdir),
  readFile: promisify(fs.readFile),
  stat: promisify(fs.stat),
  writeFile: promisify(fs.writeFile)
}

module.exports = files

async function ensureDirectoryExists (dirPath) {
  let stats
  try {
    stats = await files.stat(dirPath)
  } catch (err) {
    if (err.code === 'ENOENT') {
      await files.mkdir(dirPath, { recursive: true })
      stats = await files.stat(dirPath)
    } else {
      throw err
    }
  }
  return stats.isDirectory()
}
