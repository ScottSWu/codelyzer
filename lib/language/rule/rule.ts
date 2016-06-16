/**
 * @license
 * Copyright 2013 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as ts from 'typescript';

import {RuleFailure} from './match';
import {RuleWalker} from '../walker';

export interface IRuleMetadata {
   /**
    * The kebab-case name of the rule.
    */
    ruleName: string;

   /**
    * The type of the rule - its overall purpose
    */
    type: RuleType;

    /**
    * A short, one line description of what the rule does.
    */
    description: string;

    /**
    * More elaborate details about the rule.
    */
    descriptionDetails?: string;

   /**
    * An explanation of the available options for the rule.
    */
    optionsDescription?: string;

   /**
    * Schema of the options the rule accepts.
    * The first boolean for whether the rule is enabled or not is already implied.
    * This field describes the options after that boolean.
    * If null, this rule has no options and is not configurable.
    */
    options: any;

   /**
    * Examples of what a standard config for the rule might look like.
    */
    optionExamples?: string[];

   /**
    * An explanation of why the rule is useful.
    */
    rationale?: string;
}

export type RuleType = "functionality" | "maintainability" | "style" | "typescript";

export interface IOptions {
  ruleArguments?: any[];
  ruleName: string;
  disabledIntervals: IDisabledInterval[];
}

export interface IDisabledInterval {
  startPosition: number;
  endPosition: number;
}

export interface IRule {
  getOptions(): IOptions;
  isEnabled(): boolean;
  apply(sourceFile: ts.SourceFile): RuleFailure[];
  applyWithWalker(walker: RuleWalker): RuleFailure[];
}

