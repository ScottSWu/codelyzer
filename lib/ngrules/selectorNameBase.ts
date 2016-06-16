import * as ts from 'typescript';
import {sprintf} from 'sprintf-js';

import {AbstractRule, RuleWalker, RuleFailure, Fix, IDisabledInterval, IOptions, createLanguageServiceHost} from '../language';

import SyntaxKind = require('./util/syntaxKind');

export enum COMPONENT_TYPE {
  COMPONENT,
  DIRECTIVE,
  ANY
};

export abstract class SelectorRule extends AbstractRule {
  constructor(ruleName: string, value: any, disabledIntervals: IDisabledInterval[],
    private validator: Function, private failureString: string, private target: COMPONENT_TYPE = COMPONENT_TYPE.ANY) {
    super(ruleName, value, disabledIntervals);
  }

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): RuleFailure[] {
    let documentRegistry = ts.createDocumentRegistry();
    let languageServiceHost = createLanguageServiceHost('file.ts', sourceFile.getFullText());
    let languageService : ts.LanguageService = ts.createLanguageService(languageServiceHost, documentRegistry);
    return this.applyWithWalker(
      new SelectorNameValidatorWalker(sourceFile, program, this));
  }

  public getFailureString(failureConfig: any): string {
    return sprintf(this.failureString, failureConfig.className, this.getOptions().ruleArguments[0], failureConfig.selector);
  }

  public validate(selector: string): boolean {
    return this.validator(selector);
  }

  public get targetType(): COMPONENT_TYPE {
    return this.target;
  }
}

class SelectorNameValidatorWalker extends RuleWalker {
  constructor(sourceFile: ts.SourceFile, program: ts.Program, private rule: SelectorRule) {
    super(sourceFile, rule.getOptions(), program);
  }

  visitClassDeclaration(node: ts.ClassDeclaration) {
    (node.decorators || []).forEach(this.validateDecorator.bind(this, node.name.text));
    super.visitClassDeclaration(node);
  }

  private validateDecorator(className: string, decorator: ts.Decorator) {
    let baseExpr = <any>decorator.expression || {};
    let expr = baseExpr.expression || {};
    let name = expr.text;
    let args = baseExpr.arguments || [];
    let arg = args[0];
    if (this.rule.targetType === COMPONENT_TYPE.ANY ||
        name === 'Component' && this.rule.targetType === COMPONENT_TYPE.COMPONENT ||
        name === 'Directive' && this.rule.targetType === COMPONENT_TYPE.DIRECTIVE) {
      this.validateSelector(className, arg);
    }
  }

  private validateSelector(className: string, arg: ts.Node) {
    if (arg.kind === SyntaxKind.current().ObjectLiteralExpression) {
      (<ts.ObjectLiteralExpression>arg).properties.filter(prop => (<any>prop.name).text === 'selector')
      .forEach(prop => {
        let p = <any>prop;
        if (isSupportedKind(p.initializer.kind) && !this.rule.validate(p.initializer.text)) {
          let error = this.rule.getFailureString({ selector: p.initializer.text, className });
          this.addFailure(this.createFailure(p.initializer.getStart(), p.initializer.getWidth(), error));
        }
      });
    }

    function isSupportedKind( kind: number ): boolean {
      const current = SyntaxKind.current();
      return [current.StringLiteral, current.NoSubstitutionTemplateLiteral].some(kindType => kindType === kind)
    }
  }
}
