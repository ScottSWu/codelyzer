/**
 * @license
 * Copyright 2016 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {IDisabledInterval} from './language';

export function arrayify<T>(arg: T | T[]): T[] {
  if (Array.isArray(arg)) {
    return arg;
  } else if (arg != null) {
    return [arg];
  } else {
    return [];
  }
}

export function objectify(arg: any): any {
  if (typeof arg === "object" && arg != null) {
    return arg;
  } else {
    return {};
  }
}

/**
 * Strip comments from file content.
 */
export function stripComments(content: string): string {
  /**
  * First capturing group matches double quoted string
  * Second matches single quotes string
  * Third matches block comments
  * Fourth matches line comments
  */
  const regexp: RegExp = /("(?:[^\\\"]*(?:\\.)?)*")|('(?:[^\\\']*(?:\\.)?)*')|(\/\*(?:\r?\n|.)*?\*\/)|(\/{2,}.*?(?:(?:\r?\n)|$))/g;
  let result = content.replace(regexp, (match, m1, m2, m3, m4) => {
    // Only one of m1, m2, m3, m4 matches
    if (m3) {
      // A block comment. Replace with nothing
      return "";
    } else if (m4) {
      // A line comment. If it ends in \r?\n then keep it.
      let length = m4.length;
      if (length > 2 && m4[length - 1] === "\n") {
        return m4[length - 2] === "\r" ? "\r\n" : "\n";
      } else {
        return "";
      }
    } else {
      // We match a string
      return match;
    }
  });
  return result;
};

/**
 * @license
 * Copyright 2013 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from "fs";
import * as path from "path";

const findup = require('findup-sync');
const resolve = require('resolve');

export interface IConfigurationFile {
  rulesDirectory?: string | string[];
  rules?: any;
}

export const CONFIG_FILENAME = "codelyzer.json";

const PACKAGE_DEPRECATION_MSG = "Configuration of TSLint via package.json has been deprecated, "
  + "please start using a tslint.json file instead (http://palantir.github.io/tslint/usage/tslint-json/).";

const BUILT_IN_CONFIG = /^tslint:(.*)$/;

/**
 * Searches for a TSLint configuration and returns the data from the config.
 * @param configFile A path to a config file, this can be null if the location of a config is not known
 * @param inputFileLocation A path to the current file being linted. This is the starting location
 * of the search for a configuration.
 * @returns A TSLint configuration object
 */
export function findConfiguration(configFile: string, inputFilePaths: string[]): IConfigurationFile {
  const configPath = findConfigurationPath(configFile, inputFilePaths);
  return loadConfigurationFromPath(configPath);
}

/**
 * Searches for a TSLint configuration and returns the path to it.
 * Could return undefined if not configuration is found.
 * @param suppliedConfigFilePath A path to an known config file supplied by a user. Pass null here if
 * the location of the config file is not known and you want to search for one.
 * @param inputFilePath A path to the current file being linted. This is the starting location
 * of the search for a configuration.
 * @returns An absolute path to a tslint.json file, a path to a package.json file with a tslintConfig field
 * or undefined if neither can be found.
 */
export function findConfigurationPath(suppliedConfigFilePath: string, inputFilePaths: string[]) {
  if (suppliedConfigFilePath != null) {
    if (!fs.existsSync(suppliedConfigFilePath)) {
      throw new Error(`Could not find config file at: ${path.resolve(suppliedConfigFilePath)}`);
    } else {
      return path.resolve(suppliedConfigFilePath);
    }
  } else {
    // search for tslint.json from input file location
    for (const inputFilePath of inputFilePaths) {
      const configFilePath = findup(CONFIG_FILENAME, { cwd: inputFilePath, nocase: true });
      if (configFilePath != null && fs.existsSync(configFilePath)) {
        return path.resolve(configFilePath);
      }
    }

    // search for package.json with tslintConfig property
    for (const inputFilePath of inputFilePaths) {
      const configFilePath = findup("package.json", { cwd: inputFilePath, nocase: true });
      if (configFilePath != null && require(configFilePath).tslintConfig != null) {
        return path.resolve(configFilePath);
      }
    }

    // search for tslint.json in home directory
    const homeDir = getHomeDir();
    if (homeDir != null) {
      for (const inputFilePath of inputFilePaths) {
        const configFilePath = path.join(homeDir, CONFIG_FILENAME);
        if (fs.existsSync(configFilePath)) {
          return path.resolve(configFilePath);
        }
      }
    }

    // no path could be found
    return undefined;
  }
}

/**
 * Used Node semantics to load a configuration file given configFilePath.
 * For example:
 * '/path/to/config' will be treated as an absolute path
 * './path/to/config' will be treated as a relative path
 * 'path/to/config' will attempt to load a to/config file inside a node module named path
 * @returns a configuration object for TSLint loaded from the file at configFilePath
 */
export function loadConfigurationFromPath(configFilePath: string): IConfigurationFile {
  if (configFilePath == null) {
    return null;
  } else if (path.basename(configFilePath) === "package.json") {
    console.warn(PACKAGE_DEPRECATION_MSG);
    return require(configFilePath).tslintConfig;
  } else {
    const resolvedConfigFilePath = resolveConfigurationPath(configFilePath);
    let configFile: IConfigurationFile;
    if (path.extname(resolvedConfigFilePath) === ".json") {
      const fileContent = stripComments(fs.readFileSync(resolvedConfigFilePath).toString());
      configFile = JSON.parse(fileContent);
    } else {
      configFile = require(resolvedConfigFilePath);
      delete require.cache[resolvedConfigFilePath];
    }

    const configFileDir = path.dirname(resolvedConfigFilePath);

    configFile.rulesDirectory = getValidDirectories(configFile.rulesDirectory, configFileDir);
    return configFile;
  }
}

/**
 * Resolve configuration file path or node_module reference
 * @param filePath Relative ("./path"), absolute ("/path"), node module ("path"), or built-in ("tslint:path")
 */
function resolveConfigurationPath(filePath: string, relativeTo?: string) {
  const matches = filePath.match(BUILT_IN_CONFIG);
  const isBuiltInConfig = matches != null;
  if (isBuiltInConfig) {
    const configName = matches[1];
    try {
      return require.resolve(`./configs/${configName}`);
    } catch (err) {
      throw new Error(`${filePath} is not a built-in config, try "tslint:recommended" instead.`);
    }
  }

  const basedir = relativeTo || process.cwd();
  try {
    return resolve.sync(filePath, { basedir });
  } catch (err) {
    try {
      return require.resolve(filePath);
    } catch (err) {
      throw new Error(`Invalid "extends" configuration value - could not require "${filePath}". ` +
        "Review the Node lookup algorithm (https://nodejs.org/api/modules.html#modules_all_together) " +
        "for the approximate method TSLint uses to find the referenced configuration file.");
    }
  }
}

export function extendConfigurationFile(config: IConfigurationFile, baseConfig: IConfigurationFile): IConfigurationFile {
  let combinedConfig: IConfigurationFile = {};

  const baseRulesDirectory = arrayify(baseConfig.rulesDirectory);
  const configRulesDirectory = arrayify(config.rulesDirectory);
  combinedConfig.rulesDirectory = configRulesDirectory.concat(baseRulesDirectory);

  combinedConfig.rules = {};
  for (const name of Object.keys(objectify(baseConfig.rules))) {
    combinedConfig.rules[name] = baseConfig.rules[name];
  }
  for (const name of Object.keys(objectify(config.rules))) {
    combinedConfig.rules[name] = config.rules[name];
  }

  return combinedConfig;
}

function getHomeDir() {
  const environment = global.process.env;
  const paths = [
    environment.USERPROFILE,
    environment.HOME,
    environment.HOMEPATH,
    environment.HOMEDRIVE + environment.HOMEPATH,
  ];

  for (const homePath of paths) {
    if (homePath != null && fs.existsSync(homePath)) {
      return homePath;
    }
  }
}

export function getRelativePath(directory: string, relativeTo?: string): string {
  if (directory != null) {
    const basePath = relativeTo || process.cwd();
    return path.resolve(basePath, directory);
  }
}

/**
 * @param directories A path(s) to a directory of custom rules
 * @param relativeTo A path that directories provided are relative to.
 * For example, if the directories come from a tslint.json file, this path
 * should be the path to the tslint.json file.
 * @return An array of absolute paths to directories potentially containing rules
 */
export function getValidDirectories(directories: string | string[], relativeTo?: string): string[] {
  const rulesDirectories = arrayify(directories).map(dir => getRelativePath(dir, relativeTo));

  for (const directory of rulesDirectories) {
    if (!fs.existsSync(directory)) {
      throw new Error(`Could not find custom rule directory: ${directory}`);
    }
  }

  return rulesDirectories;
}

export interface IEnableDisablePosition {
  isEnabled: boolean;
  position: number;
}

export function buildDisabledIntervalsFromSwitches(ruleSpecificList: IEnableDisablePosition[], allList: IEnableDisablePosition[]) {
  let isCurrentlyDisabled = false;
  let disabledStartPosition: number;
  const disabledIntervalList: IDisabledInterval[] = [];
  let i = 0;
  let j = 0;

  while (i < ruleSpecificList.length || j < allList.length) {
    const ruleSpecificTopPositon = (i < ruleSpecificList.length ? ruleSpecificList[i].position : Infinity);
    const allTopPositon = (j < allList.length ? allList[j].position : Infinity);
    let newPositionToCheck: IEnableDisablePosition;
    if (ruleSpecificTopPositon < allTopPositon) {
      newPositionToCheck = ruleSpecificList[i];
      i++;
    } else {
      newPositionToCheck = allList[j];
      j++;
    }

    // we're currently disabled and enabling, or currently enabled and disabling -- a switch
    if (newPositionToCheck.isEnabled === isCurrentlyDisabled) {
      if (!isCurrentlyDisabled) {
        // start a new interval
        disabledStartPosition = newPositionToCheck.position;
        isCurrentlyDisabled = true;
      } else {
        // we're currently disabled and about to enable -- end the interval
        disabledIntervalList.push({
          endPosition: newPositionToCheck.position,
          startPosition: disabledStartPosition,
        });
        isCurrentlyDisabled = false;
      }
    }
  }

  if (isCurrentlyDisabled) {
    // we started an interval but didn't finish one -- so finish it with an Infinity
    disabledIntervalList.push({
      endPosition: Infinity,
      startPosition: disabledStartPosition,
    });
  }
  return disabledIntervalList;
}

