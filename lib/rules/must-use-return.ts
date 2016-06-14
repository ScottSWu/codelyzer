// See https://github.com/palantir/tslint/issues/1154

import * as ts from 'typescript';
import {IOptions, AbstractRule, RefactorRuleWalker, Match, Fix} from '../language';

export class MustUseReturn extends AbstractRule {
  public static RULE_NAME = 'must-use-return';
  public static FAILURE_STRING = 'Non-void return values must be used.';

  public apply(sourceFile: ts.SourceFile): Match[] {
    return [];
  }

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Match[] {
    return this.applyWithWalker(new MustUseReturnWalker(sourceFile, this.getOptions(), program));
  }
}

class MustUseReturnWalker extends RefactorRuleWalker {
  private scanner: ts.Scanner;

  constructor(sourceFile: ts.SourceFile, options: IOptions, program: ts.Program) {
    super(sourceFile, options, program);
    this.scanner = ts.createScanner(ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, sourceFile.text);
  }

  public visitCallExpression(node: ts.CallExpression) {
    const tc = this.getTypeChecker();
    const signature = tc.getResolvedSignature(node);
    const typeName = tc.typeToString(tc.getReturnTypeOfSignature(signature));
    if (typeName !== "void") {
      // Parent must not be ExpressionStatement
      // TODO Catch trickier cases (e.g. (x());)
      if (node.parent.kind === ts.SyntaxKind.ExpressionStatement) {
        let fix = new Fix(node.parent.getStart(), node.parent.getEnd());
        fix.description = "Remove statement";
        fix.replacements = [{
          start: node.parent.getStart(),
          end: node.parent.getEnd(),
          replaceWith: ""
        }];
        fix.safe = true;
        // TODO Fix by making the function void type (if not used anywhere else)
        this.addMatch(this.createMatch(
          node.getStart(),
          node.getWidth(),
          MustUseReturn.FAILURE_STRING,
          [fix]));
      }
    }

    super.visitCallExpression(node);
  }
}
