// See https://github.com/palantir/tslint/issues/624

import * as ts from 'typescript';
import {IOptions, AbstractRule, SyntaxWalker, RefactorRuleWalker, Match, Fix} from '../language';

export class NoUseBeforeInitialization extends AbstractRule {
  public static RULE_NAME = 'no-use-before-initialization';
  public static FAILURE_STRING_ACCESS =
    'Variables can not have properties accessed before the variable is initialized.';
  public static FAILURE_STRING_EXPRESSION =
    'Variables can not be used before they are initialized.';
  public static FAILURE_STRING_UNUSED =
    'This variable does not seem to be used at all.';
  public static FAILURE_STRING_LOOP =
    'Variable initialization is missing in loop.';

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Match[] {
    return this.applyWithWalker(new NoUseBeforeInitializationWalker(sourceFile, this.getOptions(), program));
  }
}

class NoUseBeforeInitializationWalker extends RefactorRuleWalker {
  private scanner: ts.Scanner;

  constructor(sourceFile: ts.SourceFile, options: IOptions, program: ts.Program) {
    super(sourceFile, options, program);
    this.scanner = ts.createScanner(ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, sourceFile.text);
  }

  public visitVariableDeclaration(node: ts.VariableDeclaration) {
    if (node.initializer == undefined && node.name.kind == ts.SyntaxKind.Identifier) {
      // TODO Support BindingPatterns
      let id = node.name as ts.Identifier;
      let statement: ts.Node = node.parent.parent;

      if (statement.kind === ts.SyntaxKind.VariableStatement) {
        // Handle variable statement
        let block = statement.parent;
        if (block.kind === ts.SyntaxKind.Block || block.kind === ts.SyntaxKind.SourceFile) {
          let statements = (block as ts.Block | ts.SourceFile).statements;
          // Find the first use of the variable
          let index = statements.indexOf(statement as ts.Statement);
          // Look at all statements afterwards
          while (index < statements.length) {
            let next = statements[index];

            let walker = new FirstUseWalker(id, this.getTypeChecker());
            walker.walk(next);
            switch (walker.getResult()) {
              case Result.ACCESSED:
                this.addMatch(this.createMatch(
                  node.getStart(),
                  node.getWidth(),
                  NoUseBeforeInitialization.FAILURE_STRING_ACCESS,
                  []));
                break;
              case Result.EXPRESSION:
                this.addMatch(this.createMatch(
                  node.getStart(),
                  node.getWidth(),
                  NoUseBeforeInitialization.FAILURE_STRING_EXPRESSION,
                  []));
                break;
              case Result.NOT_FOUND:
                break;
              case Result.INITIALIZED:
                return;
            }

            index++;
          }

          // At this point, no use of the variable has been found
        }
      }
      else if (statement.kind === ts.SyntaxKind.ForStatement) {
        // This is probably an issue if the first expression does not
        // initialize a declared counter for the for loop.
        this.addMatch(this.createMatch(
          node.getStart(),
          node.getWidth(),
          NoUseBeforeInitialization.FAILURE_STRING_LOOP,
          []));
      }
    }

    super.visitVariableDeclaration(node);
  }
}

enum Result {
  NOT_FOUND,   // Potentially removable
  INITIALIZED, // Good
  EXPRESSION,  // Soft error
  ACCESSED     // Hard error
}

class FirstUseWalker extends SyntaxWalker {
  private result: Result;

  constructor(private target: ts.Identifier, private typeChecker: ts.TypeChecker) {
    super();
    this.result = Result.NOT_FOUND;
  }

  public getResult(): Result {
    return this.result;
  }

  public visitBinaryExpression(node: ts.BinaryExpression) {
    const tc = this.typeChecker;
    if (node.left.kind === ts.SyntaxKind.Identifier &&
      (node.left as ts.Identifier).text === this.target.text &&
      node.operatorToken.kind === ts.SyntaxKind.FirstAssignment) {
      // Ensure that the variable isn't used on the right hand side either
      super.visitNode(node.right);
      if (this.result === Result.NOT_FOUND) {
        this.result = Result.INITIALIZED;
      }
      return;
    }

    super.visitBinaryExpression(node);
  }

  public visitElementAccessExpression(node: ts.ElementAccessExpression) {
    if (node.argumentExpression.kind === ts.SyntaxKind.Identifier &&
      (node.argumentExpression as ts.Identifier).text === this.target.text) {
      // Element accessed before initialized
      this.result = Result.ACCESSED;
      return;
    }

    super.visitElementAccessExpression(node);
  }

  public visitPropertyAccessExpression(node: ts.PropertyAccessExpression) {
    if (node.expression.kind === ts.SyntaxKind.Identifier &&
      (node.expression as ts.Identifier).text === this.target.text) {
      this.result = Result.ACCESSED;
      return;
    }

    super.visitPropertyAccessExpression(node);
  }
}
