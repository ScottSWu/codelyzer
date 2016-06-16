import * as ts from 'typescript';

const OPTION_ALWAYS = 'always';
const OPTION_NEVER = 'never';
const OPTION_IGNORE_INTERFACES = 'ignore-interfaces';

import {RuleFailure, AbstractRule, RuleWalker, Fix} from '../language';

export class Rule extends AbstractRule {
  public static RULE_NAME = 'semicolon';
  public static FAILURE_STRING_MISSING = 'missing semicolon';
  public static FAILURE_STRING_UNNECESSARY = 'unnecessary semicolon';

  public apply(sourceFile: ts.SourceFile): RuleFailure[] {
    return this.applyWithWalker(new SemicolonWalker(sourceFile, this.getOptions()));
  }
}

class SemicolonWalker extends RuleWalker {
  public visitVariableStatement(node: ts.VariableStatement) {
    this.checkSemicolonAt(node);
    super.visitVariableStatement(node);
  }

  public visitExpressionStatement(node: ts.ExpressionStatement) {
    this.checkSemicolonAt(node);
    super.visitExpressionStatement(node);
  }

  public visitReturnStatement(node: ts.ReturnStatement) {
    this.checkSemicolonAt(node);
    super.visitReturnStatement(node);
  }

  public visitBreakStatement(node: ts.BreakOrContinueStatement) {
    this.checkSemicolonAt(node);
    super.visitBreakStatement(node);
  }

  public visitContinueStatement(node: ts.BreakOrContinueStatement) {
    this.checkSemicolonAt(node);
    super.visitContinueStatement(node);
  }

  public visitThrowStatement(node: ts.ThrowStatement) {
    this.checkSemicolonAt(node);
    super.visitThrowStatement(node);
  }

  public visitImportDeclaration(node: ts.ImportDeclaration) {
    this.checkSemicolonAt(node);
    super.visitImportDeclaration(node);
  }

  public visitImportEqualsDeclaration(node: ts.ImportEqualsDeclaration) {
    this.checkSemicolonAt(node);
    super.visitImportEqualsDeclaration(node);
  }

  public visitDoStatement(node: ts.DoStatement) {
    this.checkSemicolonAt(node);
    super.visitDoStatement(node);
  }

  public visitDebuggerStatement(node: ts.Statement) {
    this.checkSemicolonAt(node);
    super.visitDebuggerStatement(node);
  }

  public visitPropertyDeclaration(node: ts.PropertyDeclaration) {
    const initializer = node.initializer;
    /* ALWAYS === 'enabled' for this rule. */
    if (this.hasOption(OPTION_NEVER) || !(initializer && initializer.kind === ts.SyntaxKind.ArrowFunction)) {
      this.checkSemicolonAt(node);
    }
    super.visitPropertyDeclaration(node);
  }

  public visitInterfaceDeclaration(node: ts.InterfaceDeclaration) {
    if (this.hasOption(OPTION_IGNORE_INTERFACES)) {
      return;
    }

    for (let member of node.members) {
      this.checkSemicolonAt(member);
    }
    super.visitInterfaceDeclaration(node);
  }

  public visitExportAssignment(node: ts.ExportAssignment) {
    this.checkSemicolonAt(node);
    super.visitExportAssignment(node);
  }

  private checkSemicolonAt(node: ts.Node) {
    const sourceFile = this.getSourceFile();
    const children = node.getChildren(sourceFile);
    const hasSemicolon = children.some((child: ts.Node) => child.kind === ts.SyntaxKind.SemicolonToken);
    const position = node.getStart(sourceFile) + node.getWidth(sourceFile);
    const nodeEnd = node.getEnd();
    // Backwards compatible with plain {'semicolon': true}
    const always = this.hasOption(OPTION_ALWAYS) || (this.getOptions() && this.getOptions().length === 0);

    if (always && !hasSemicolon) {
      let start = Math.min(position, this.getLimit());
      this.addFailure(this.createFailure(start, 0, Rule.FAILURE_STRING_MISSING, this.getFixes(nodeEnd)));
    } else if (this.hasOption(OPTION_NEVER) && hasSemicolon) {
      const scanner = ts.createScanner(ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, sourceFile.text);
      scanner.setTextPos(position);

      let tokenKind = scanner.scan();
      while (tokenKind === ts.SyntaxKind.WhitespaceTrivia || tokenKind === ts.SyntaxKind.NewLineTrivia) {
        tokenKind = scanner.scan();
      }

      if (tokenKind !== ts.SyntaxKind.OpenParenToken && tokenKind !== ts.SyntaxKind.OpenBracketToken
          && tokenKind !== ts.SyntaxKind.PlusToken && tokenKind !== ts.SyntaxKind.MinusToken) {
        let start = Math.min(position - 1, this.getLimit());
        this.addFailure(this.createFailure(start, 1, Rule.FAILURE_STRING_UNNECESSARY, this.getFixes(nodeEnd)));
      }
    }
  }

  private getFixes(start: number): Fix[] {
    let fix = new Fix(start, start);
    fix.safe = true;
    fix.description = 'Add semicolon';
    fix.replacements = [{
      start,
      end: start,
      replaceWith: ';'
    }];
    return [fix];
  }
}
