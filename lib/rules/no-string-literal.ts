// See https://github.com/palantir/tslint/issues/1257

import * as ts from 'typescript';
import {IOptions, AbstractRule, RefactorRuleWalker, Match, Fix} from '../language';

export class NoStringLiteral extends AbstractRule {
  public static RULE_NAME = 'no-string-literal';
  public static FAILURE_STRING = 'Object properties cannot be accessed through string literals.';

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Match[] {
    return this.applyWithWalker(new NoStringLiteralWalker(sourceFile, this.getOptions(), program));
  }
}

// The walker takes care of all the work.
class NoStringLiteralWalker extends RefactorRuleWalker {
  private scanner: ts.Scanner;

  constructor(sourceFile: ts.SourceFile, options: IOptions, program: ts.Program) {
    super(sourceFile, options, program);
    this.scanner = ts.createScanner(ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, sourceFile.text);
  }

  public visitElementAccessExpression(node: ts.ElementAccessExpression) {
    if (node.argumentExpression.kind === ts.SyntaxKind.StringLiteral) {
      // Make sure it is part of the type
      const tc = this.getTypeChecker();

      let obj = node.expression;

      let arg = node.argumentExpression as ts.StringLiteral;
      let fix = new Fix(node.getStart(), node.getEnd());
      fix.description = "???";
      fix.replacements = [{
        start: arg.getStart() - 1,
        end: arg.getEnd() + 1,
        replaceWith: "." + arg.text
      }];
      fix.safe = true;
      this.addMatch(this.createMatch(
        node.getStart(),
        node.getWidth(),
        NoStringLiteral.FAILURE_STRING,
        [fix]));
    }

    super.visitElementAccessExpression(node);
  }
}
