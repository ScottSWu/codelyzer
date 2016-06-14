import {sprintf} from 'sprintf-js';
import * as ts from 'typescript';
import {AbstractRule, RefactorRuleWalker, Match, Fix, IDisabledInterval, IOptions, createLanguageServiceHost} from '../language';

import SyntaxKind = require('./util/syntaxKind');

export interface IUsePropertyDecoratorConfig {
  propertyName: string;
  decoratorName: string | string[];
  errorMessage: string;
}

export class UsePropertyDecorator extends AbstractRule {
  public static formatFailureString(config: IUsePropertyDecoratorConfig, decoratorName: string, className: string) {
    let decorators = config.decoratorName;
    if (decorators instanceof Array) {
      decorators = (<string[]>decorators).map(d => `"@${d}"`).join(', ');
    } else {
      decorators = `"@${decorators}"`;
    }
    return sprintf(config.errorMessage, decoratorName, className, config.propertyName, decorators);
  }

  constructor(private config: IUsePropertyDecoratorConfig, ruleName: string, value: any, disabledIntervals: IDisabledInterval[]) {
    super(ruleName, value, disabledIntervals);
  }

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Match[] {
    let documentRegistry = ts.createDocumentRegistry();
    let languageServiceHost = createLanguageServiceHost('file.ts', sourceFile.getFullText());
    return this.applyWithWalker(
      new DirectiveMetadataWalker(sourceFile, this.getOptions(), program, this.config));
  }
}

class DirectiveMetadataWalker extends RefactorRuleWalker {
  constructor(sourceFile: ts.SourceFile, options: IOptions,
    program: ts.Program, private config: IUsePropertyDecoratorConfig) {
      super(sourceFile, options, program);
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
    if (/^(Component|Directive)$/.test(name) && arg) {
      this.validateProperty(className, name, arg);
    }
  }

  private validateProperty(className: string, decoratorName: string, arg: ts.ObjectLiteralExpression) {
    if (arg.kind === SyntaxKind.current().ObjectLiteralExpression) {
      (<ts.ObjectLiteralExpression>arg).properties.filter(prop => (<any>prop.name).text === this.config.propertyName)
      .forEach(prop => {
        let p = <any>prop;
        this.addMatch(
          this.createMatch(
            p.getStart(),
            p.getWidth(),
            UsePropertyDecorator.formatFailureString(this.config, decoratorName, className)));
      });
    }
  }
}
