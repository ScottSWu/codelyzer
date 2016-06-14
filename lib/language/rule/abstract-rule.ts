import * as ts from 'typescript';
import {RefactorRuleWalker} from '../walker';
import {Match, IOptions, IRule, IDisabledInterval} from './';

export enum RULE_SEVERITY {
  ERROR, WARNING, INFO
};

export abstract class AbstractRule implements IRule {
  public static NAME: string = "";;
  public static SEVERITY: RULE_SEVERITY = RULE_SEVERITY.INFO;
  public static DESCRIPTION: string = "";
  public static FAILURE_STRING: string = "";

  private options: IOptions;

  constructor(ruleName: string, private value: any, disabledIntervals: IDisabledInterval[]) {
    let ruleArguments: any[] = [];

    if (Array.isArray(value) && value.length > 1) {
      ruleArguments = value.slice(1);
    }

    this.options = {
      disabledIntervals: disabledIntervals,
      ruleArguments: ruleArguments,
      ruleName: ruleName,
    };
  }

  public getOptions(): IOptions {
    return this.options;
  }

  public setDisabledIntervals(di: IDisabledInterval[]) {
    this.options.disabledIntervals = di;
  }

  public apply(sourceFile: ts.SourceFile): Match[] {
    return [];
  }

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Match[] {
    // Default to just the sourceFile
    // This ensures compatibility with TSLint
    return this.apply(sourceFile);
  }

  public applyWithWalker(walker: RefactorRuleWalker): Match[] {
    walker.walk(walker.getSourceFile());
    return walker.getMatches();
  }

  public isEnabled(): boolean {
    const value = this.value;

    if (typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value) && value.length > 0) {
      return value[0];
    }

    return false;
  }
}

