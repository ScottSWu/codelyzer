import * as ts from 'typescript';
import {RuleWalker} from '../walker';
import {RuleFailure, IRuleMetadata, IOptions, IRule, IDisabledInterval} from './';

export enum RULE_SEVERITY {
  ERROR, WARNING, INFO
};

export abstract class AbstractRule implements IRule {
  public static metadata: IRuleMetadata;

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

  public apply(sourceFile: ts.SourceFile): RuleFailure[] {
    return [];
  }

  public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): RuleFailure[] {
    // Default to just the sourceFile
    // This ensures compatibility with TSLint
    return this.apply(sourceFile);
  }

  public applyWithWalker(walker: RuleWalker): RuleFailure[] {
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

