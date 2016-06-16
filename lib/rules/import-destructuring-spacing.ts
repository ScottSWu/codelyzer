import * as ts from 'typescript';
import {IOptions, IRuleMetadata, AbstractRule, RuleWalker, RuleFailure, Fix} from '../language';

export class ImportDestructuring extends AbstractRule {
  public static metadata: IRuleMetadata = {
    ruleName: 'import-destructuring-spacing',
    type: "style",
    description: "You need to leave whitespaces inside of the import statement\'s curly braces ($$03-05$$)",
    options: null
  };

  public static FAILURE_STRING = "You need to leave whitespaces inside of the import statement\'s curly braces ($$03-05$$)";

  public apply(sourceFile: ts.SourceFile): RuleFailure[] {
    return this.applyWithWalker(new ImportDestructuringSpacingWalker(sourceFile, this.getOptions()));
  }
}

// The walker takes care of all the work.
class ImportDestructuringSpacingWalker extends RuleWalker {
  private scanner: ts.Scanner;

  constructor(sourceFile: ts.SourceFile, options: IOptions) {
    super(sourceFile, options);
    this.scanner = ts.createScanner(ts.ScriptTarget.ES5, false, ts.LanguageVariant.Standard, sourceFile.text);
  }

  private getFixes(importClause: ts.ImportClause): Fix[] {
    const text = importClause.namedBindings.getText();
    let start = importClause.namedBindings.getStart();
    let width = importClause.namedBindings.getWidth();
    let fix = new Fix(start, start + width);
    fix.description = 'Add spaces between curly braces';
    fix.safe = true;
    fix.replacements = [{
      start: start,
      end: start + width,
      replaceWith: text.replace('{', '{ ').replace('}', ' }')
    }];
    return [fix];
  }

  public visitImportDeclaration(node: ts.ImportDeclaration) {
    const importClause = node.importClause;
    if (importClause != null && importClause.namedBindings != null) {
      const text = importClause.namedBindings.getText();

      if (!this.checkForWhiteSpace(text)) {
        this.addFailure(this.createFailure(
          importClause.namedBindings.getStart(),
          importClause.namedBindings.getWidth(),
          ImportDestructuring.FAILURE_STRING,
          this.getFixes(importClause)));
      }
    }
    // call the base version of this visitor to actually parse this node
    super.visitImportDeclaration(node);
  }

  private checkForWhiteSpace(text: string) {
    if (/\s*\*\s+as\s+[^\s]/.test(text)) {
      return true;
    }
    return /{\s[^]*\s}/.test(text);
  }
}

