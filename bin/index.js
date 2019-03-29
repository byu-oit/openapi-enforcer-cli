#!/usr/bin/env node
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
const path = require('path')
const program = require('commander')

const commandsDirectory = path.resolve(__dirname, 'commands')
fs.readdirSync(commandsDirectory)
  .filter(filename => /\.js$/.test(filename))
  .forEach(filename => {
    const command = require(path.join(commandsDirectory, filename))
    command(program)
  })

program.command('*')
  .action((env) => {
    if (env.length) console.error('Invalid command: ' + env + '\n')
    program.help()
  })

if (process.argv.length <= 2) process.argv[2] = ''
program.parse(process.argv)
