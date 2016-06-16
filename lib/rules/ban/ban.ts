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
import {RuleFailure, AbstractRule, RuleWalker, Fix} from '../../language';

export class Rule extends AbstractRule {
    public static FAILURE_STRING_PART = 'Function invocation disallowed: ';

    public apply(sourceFile: ts.SourceFile): RuleFailure[] {
        const options = this.getOptions();
        const banFunctionWalker = new BanFunctionWalker(sourceFile, options);
        const functionsToBan = options.ruleArguments;
        functionsToBan.forEach((f) => banFunctionWalker.addBannedFunction(f));
        return this.applyWithWalker(banFunctionWalker);
    }
}

export class BanFunctionWalker extends RuleWalker {
    private bannedFunctions: string[][] = [];

    public addBannedFunction(bannedFunction: string[]) {
        this.bannedFunctions.push(bannedFunction);
    }

    public visitCallExpression(node: ts.CallExpression) {
        const expression = node.expression;

        if (expression.kind === ts.SyntaxKind.PropertyAccessExpression
                && expression.getChildCount() >= 3) {

            const firstToken = expression.getFirstToken();
            const firstChild = expression.getChildAt(0);
            const secondChild = expression.getChildAt(1);
            const thirdChild = expression.getChildAt(2);

            const rightSideExpression = thirdChild.getFullText();

            let leftSideExpression: string;

            if (firstChild.getChildCount() > 0) {
                leftSideExpression = firstChild.getLastToken().getText();
            } else {
                leftSideExpression = firstToken.getText();
            }

            if (secondChild.kind === ts.SyntaxKind.DotToken) {
                for (const bannedFunction of this.bannedFunctions) {
                    if (leftSideExpression === bannedFunction[0] && rightSideExpression === bannedFunction[1]) {
                      const invocation = `${leftSideExpression}.${rightSideExpression}`;
                        const failure = this.createFailure(
                            expression.getStart(),
                            expression.getWidth(),
                            `${Rule.FAILURE_STRING_PART}${invocation}`,
                            // Can replace the entire statement
                            // because it won't be valid without the
                            // removed expression.
                            this._getFix(node.parent, invocation)
                        );
                        this.addFailure(failure);
                    }
                }
            }
        }

        super.visitCallExpression(node);
    }

    private _getFix(node: ts.Node, msg: string) {
      const start = node.getStart();
      const end = node.getEnd();
      const fix = new Fix(start, end);
      fix.description = `Remove ${msg}`;
      fix.replacements = [{
        start, end,
        replaceWith: ''
      }];
      return [fix];
    }
}

