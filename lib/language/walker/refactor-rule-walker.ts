import * as ts from 'typescript';
import {IDisabledInterval, IOptions, Fix, Match} from '../rule';
import {doesIntersect} from '../utils';
import {SyntaxWalker} from './syntax-walker';

export class RefactorRuleWalker extends SyntaxWalker {
  private limit: number;
  private position: number;
  private options: any[];
  private matches: Match[];
  private sourceFile: ts.SourceFile;
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;
  private disabledIntervals: IDisabledInterval[];
  private ruleName: string;

  constructor(sourceFile: ts.SourceFile, options: IOptions, program: ts.Program = undefined) {
    super();

    this.position = 0;
    this.matches = [];
    this.options = options.ruleArguments;
    this.sourceFile = sourceFile;
    this.program = program;
    this.typeChecker = program ? program.getTypeChecker() : undefined;
    this.limit = this.sourceFile.getFullWidth();
    this.disabledIntervals = options.disabledIntervals;
    this.ruleName = options.ruleName;
  }

  public getSourceFile(): ts.SourceFile {
    return this.sourceFile;
  }

  public getProgram(): ts.Program {
    return this.program;
  }

  public getTypeChecker(): ts.TypeChecker {
    return this.typeChecker;
  }

  public getMatches(): Match[] {
    return this.matches;
  }

  public getLimit() {
    return this.limit;
  }

  public getOptions(): any {
    return this.options;
  }

  public hasOption(option: string): boolean {
    if (this.options) {
      return this.options.indexOf(option) !== -1;
    } else {
      return false;
    }
  }

  public skip(node: ts.Node) {
    this.position += node.getFullWidth();
  }

  public createMatch(start: number, width: number, failure: string, fixes: Fix[] = []): Match {
    const from = (start > this.limit) ? this.limit : start;
    const to = ((start + width) > this.limit) ? this.limit : (start + width);
    return new Match(this.sourceFile, from, to, failure, this.ruleName, fixes);
  }

  public addMatch(match: Match) {
    if (!this.existsFailure(match) && !doesIntersect(match, this.disabledIntervals)) {
      this.matches.push(match);
    }
  }

  private existsFailure(match: Match) {
    return this.matches.some(m => m.equals(match));
  }
}
