// See https://github.com/palantir/tslint/issues/1154

import * as ts from 'typescript';
import {IOptions, IRuleMetadata, AbstractRule, RuleWalker, RuleFailure, Fix} from '../language';

export class MustUseReturn extends AbstractRule {
  public static metadata: IRuleMetadata = {
    ruleName: 'must-use-return',
    type: "maintainability",
    description: "Non-void return values must be used.",
    options: null
  };

  public static FAILURE_STRING = "Non-void return values must be used.";

  public apply(sourceFile: ts.SourceFile): RuleFailure[] {
    return [];
  }

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): RuleFailure[] {
    return this.applyWithWalker(new MustUseReturnWalker(sourceFile, this.getOptions(), program));
  }
}

class MustUseReturnWalker extends RuleWalker {
  private scanner: ts.Scanner;

  constructor(sourceFile: ts.SourceFile, options: IOptions, program: ts.Program) {
    super(sourceFile, options, program);
    this.scanner = ts.createScanner(ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, sourceFile.text);
  }

  public visitCallExpression(node: ts.CallExpression) {
    const tc = this.getTypeChecker();
    if (node.decorators) {
      console.log(node.decorators[0]);
    }
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
        this.addFailure(this.createFailure(
          node.getStart(),
          node.getWidth(),
          MustUseReturn.FAILURE_STRING,
          //[fix]));
          []));
      }
    }

    super.visitCallExpression(node);
  }
}
