// See https://github.com/palantir/tslint/issues/1257

import * as ts from 'typescript';
import {IOptions, AbstractRule, RefactorRuleWalker, Match, Fix} from '../language';

export class NoStringLiteral extends AbstractRule {
  public static RULE_NAME = 'no-string-literal';
  public static FAILURE_STRING = 'Object properties cannot be accessed through string literals.';

  public apply(sourceFile: ts.SourceFile): Match[] {
    return this.applyWithWalker(new NoStringLiteralWalker(sourceFile, this.getOptions()));
  }
}

// The walker takes care of all the work.
class NoStringLiteralWalker extends RefactorRuleWalker {
  private scanner: ts.Scanner;

  constructor(sourceFile: ts.SourceFile, options: IOptions) {
    super(sourceFile, options);
    this.scanner = ts.createScanner(ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, sourceFile.text);
  }

  public visitElementAccessExpression(node: ts.ElementAccessExpression) {
    if (node.argumentExpression.kind === ts.SyntaxKind.StringLiteral) {
      let arg = node.argumentExpression as ts.StringLiteral;
      let fix = new Fix(node.getStart(), node.getEnd());
      fix.description = "Rewrite as a property accessor";
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
