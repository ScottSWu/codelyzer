import * as fs from 'fs';
import * as glob from 'glob';
import * as chalk from 'chalk';
import {AbstractRule, Replacement, Match, Fix} from './language';
import {Reporter} from './reporters/reporter';
import {Formatter} from './formatters/formatter';
import {findConfiguration} from './utils';
import {loadRule, loadFormatter, loadReporter} from './loader';
import {Codelyzer, RulesMap} from './codelyzer';

import {
  ICodelyzerOptionsRaw,
  ICodelyzerOptions,
} from './config';

import {
  DEFAULT_REPORTERS_DIR,
  DEFAULT_FORMATTERS_DIR,
  DEFAULT_RULES_DIR,
  DEFAULT_REPORTER,
  DEFAULT_FORMATTER,
} from './default-config';


const argv = require('yargs').argv;
const inquirer = require('inquirer');

function getRules(config: ICodelyzerOptions): RulesMap {
  let result: RulesMap = {};
  let rules = config.rules_config;
  Object.keys(rules).forEach((rule: string) => {
    let Rule = loadRule(rule, config.rules_directories);
    // Empty list of disabled intervals by default
    result[rule] = { options: rules[rule], rule: Rule };
  });
  return result;
}

function getFormatter(config: ICodelyzerOptions): Formatter {
  return loadFormatter(config.formatter, config.formatters_directories);
}

function getReporter(config: ICodelyzerOptions): Reporter {
  return loadReporter(config.reporter, config.reporters_directories);
}

function lint(rules: RulesMap, formatter: Formatter, filename: string) {
  const contents = fs.readFileSync(filename, 'utf8');
  const codelyzer = new Codelyzer(filename, contents, rules);
  const matches = codelyzer.lint();
  console.log(formatter.format(matches));
}

async function lintAndRefactor(rules: RulesMap, reporter: Reporter, filename: string) {
  const contents = fs.readFileSync(filename, 'utf8');
/*  const contents = `import {Input, Output, Component} from '@angular/core';

@Component({
  selector: 'codelyzer-tabs',
  template: '',
  inputs: ['name', 'age', 'time : timeInterval']
})
class TabsComponent {
  //...
}

const bar = 42

var fun = function () {
  return 42
}`;
*/
  const codelyzer = new Codelyzer(filename, contents, rules);
  const generator = codelyzer.process();
  let next: any;
  next = generator.next(contents);
  while (!next.done) {
    let { match } = next.value;
    let res = await reporter.report(match);
    let currentRes = generator.next(res.refactoring);
    fs.writeFileSync(filename, currentRes.value);
    next = generator.next(currentRes.value);
  }
}

function normalizeConfig(config: ICodelyzerOptionsRaw): ICodelyzerOptions {
  config = config || {};
  return {
    rules_config: config.rules_config || {},
    rules_directories: config.rules_directories || [DEFAULT_RULES_DIR],
    formatter: config.formatter || DEFAULT_FORMATTER,
    formatters_directories: config.formatters_directories || [DEFAULT_FORMATTERS_DIR],
    reporter: config.reporter || DEFAULT_REPORTER,
    reporters_directories: config.reporters_directories || [DEFAULT_REPORTERS_DIR]
  };
}

function processFile(filename: string) {
  if (!fs.existsSync(filename)) {
    console.error(`Unable to open file: ${filename}`);
    process.exit(1);
  }
  const config = normalizeConfig(findConfiguration('codelyzer.json', filename));
  const rules = getRules(config);
  if (argv['lint-only']) {
    lint(rules, getFormatter(config), filename);
  } else {
    lintAndRefactor(rules, getReporter(config), filename);
  }
};

const files = argv._;

for (const file of files) {
  glob.sync(file, { ignore: argv.e }).forEach(processFile);
}

