# Open API Enforcer CLI

A CLI tool for facilitating the use of the NPM [openapi-enforcer](https://www.npmjs.com/package/openapi-enforcer) package.

## Installation

```sh
npm install -g openapi-enforcer-cli
```

## CLI Usage

To use the command line tool use the command `openapi-enforcer` from your terminal. This will show the help.

```sh 
$ openapi-enforcer
 
Usage: index [options] [command]

Options:
  -h, --help                                output usage information

Commands:
  build <oas-doc> <out-path>                Dereference and build a single OpenAPI file from multiple sources
  create-api [options] <oas-doc> [out-dir]  Create a project
  docs [options] <oas-doc>                  Produce documentation with Redoc UI while editing an OpenAPI document
  help                                      Display help
  validate <oas-doc>                        Validate an Open API Specification document
  version                                   Get the installed version number
```

To get help about a specific command, specify the command followed by the `--help` flag.
```sh
$ openapi-enforcer create-api --help

Usage: create-api [options] <oas-doc> [out-dir]

Create a project

Options:
  -c, --controller <key>      The x-controller property name. Defaults to x-controller.
  -d, --dependencies <types>  The optional dependencies to initialize with. Use comma separated values to specify more than one. Valid values include: axios, mongodb, mysql, oracledb, postgres, request
  -i, --indent <value>        The code style of the number of spaces of indentation to use. Specify a number or "t" for tab. Defaults to 2.
  -s, --semi-colon            Set this flag to use the code style of unnecessary semi-colons to your JavaScript
  -o, --operation <key>       The x-operation property name. Defaults to x-operation.
  -h, --help                  output usage information

```
