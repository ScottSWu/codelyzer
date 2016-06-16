import * as fs from 'fs';
import * as glob from 'glob';
import * as chalk from 'chalk';
import * as ts from 'typescript';
import {AbstractRule, Replacement, RuleFailure, Fix} from './language';
import {Reporter} from './reporters/reporter';
import {Formatter} from './formatters/formatter';
import {findConfiguration} from './utils';
import {loadRule, loadFormatter, loadReporter} from './loader';
import {Codelyzer, RulesMap} from './codelyzer';

import {
  ICodelyzerOptionsRaw,
  ICodelyzerOptions,
} from './config';


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

function lint(files: string[], options: ts.CompilerOptions, codelyzerConfig: any) {
  const host = ts.createCompilerHost(options, true);
  const program = ts.createProgram(files, options, host);
  const codelyzer = new Codelyzer(files, program);
  let matchMap = codelyzer.lint();
  // TODO Provide other options to apply patches, such as the reporter,
  // a cumulative patch file (per source file) or a copy of the original.
  // TODO Currently taking the first suggested fix.
  matchMap.forEach((matches, sourceFile) => {
    let replacements = matches.reduce((acc, m) => {
      if (m.hasFix()) {
        return acc.concat(m.fixes[0].replacements);
      }
      else {
        return acc;
      }
    }, []);
    const newName = sourceFile.fileName.substring(0, sourceFile.fileName.length - 3) + ".fix.ts";
    applyReplacements(replacements, sourceFile);
    //fs.writeFileSync(newName, applyReplacements(replacements, sourceFile));
  });
}

function findOptimalReplacements(replacements: Replacement[]): Replacement[] {
  if (replacements.length === 0) {
    return replacements;
  }

  let overlap = (a: Replacement, b: Replacement) =>
    (a.start <= b.start && b.start < a.end) ||
    (a.start < b.end && b.end <= a.end);

  // Sort fixes by end
  replacements.sort((a, b) => a.end - b.end);

  let optimalFixes: Replacement[] = [];

  let lastFix = replacements[0].start;
  for (let i = 0; i < replacements.length; i++) {
    if (replacements[i].start >= lastFix) {
      optimalFixes.push(replacements[i]);
      lastFix = replacements[i].end;
    }
  }

  // Reverse the order
  optimalFixes.reverse();

  return optimalFixes;
}

function applyReplacements(replacements: Replacement[], source: ts.SourceFile): string {
  const sourceText = source.getFullText();

  // To be safe, don't fix overlapping changes
  let lastChanged = sourceText.length;
  let fixedText = sourceText;
  replacements = findOptimalReplacements(replacements);

  replacements.forEach((fix) => {
    if (fix.end > lastChanged) {
      // Skip overlapping change
      return;
    }
    fixedText = fixedText.substring(0, fix.start) + fix.replaceWith + fixedText.substring(fix.end);
    lastChanged = fix.start;
  });

  console.log("Made " + replacements.length + " replacements in " + source.fileName);

  return fixedText;
}

function processFiles(files: string[], config: any): void {
  const missingFiles: string[] = files.reduce(
    (nex, f) => nex.concat(fs.existsSync(f) ? [] : f), []);
  if (missingFiles.length > 0) {
    missingFiles.forEach(f => console.error(`Unable to open file: ${f}`));
    process.exit(1);
  }
  const codelyzerConfig = JSON.parse(fs.readFileSync('codelyzer.json').toString());
  lint(files, config, codelyzerConfig);
}

// Search for the copmiling folder
let compileFolder = argv.folder || ".";
if (!ts.sys.directoryExists(compileFolder)) {
  console.error("Specified folder doesnot exist.")
}
else {
  compileFolder = ".";
}

// Search for a tsconfig file
let config: any;
if (ts.sys.fileExists("tsconfig.json")) {
  // Import options
  config = ts.readConfigFile("tsconfig.json", read => fs.readFileSync(read).toString()).config;
}
else {
  // TODO Default options
}

// Find all files in the direcotry.
let files = ts.sys.readDirectory(argv.folder || ".", "ts", config.exclude);

processFiles(files, config);
