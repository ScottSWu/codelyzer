import * as ts from 'typescript';
import {Fix} from './fix';

export class RuleFailurePosition {
  protected position: number;
  protected lineAndCharacter: ts.LineAndCharacter;

  constructor(position: number, lineAndCharacter: ts.LineAndCharacter) {
    this.position = position;
    this.lineAndCharacter = lineAndCharacter;
  }

  public getPosition() {
    return this.position;
  }

  public getLineAndCharacter() {
    return this.lineAndCharacter;
  }

  public toJS() {
    return {
      character: this.lineAndCharacter.character,
      line: this.lineAndCharacter.line,
      position: this.position,
    };
  }

  public equals(ruleFailurePosition: RuleFailurePosition) {
    const ll = this.lineAndCharacter;
    const rr = ruleFailurePosition.lineAndCharacter;

    return this.position === ruleFailurePosition.position
        && ll.line === rr.line
        && ll.character === rr.character;
  }
}

export class RuleFailure {
  protected fileName: string;
  protected startPosition: RuleFailurePosition;
  protected endPosition: RuleFailurePosition;

  constructor(protected sourceFile: ts.SourceFile,
              protected start: number,
              protected end: number,
              protected failure: string,
              protected ruleName: string,
              public fixes: Fix[] = []) {

    this.sourceFile = sourceFile;
    this.fileName = sourceFile.fileName;
    this.startPosition = this.createFailurePosition(start);
    this.endPosition = this.createFailurePosition(end);
    this.failure = failure;
    this.ruleName = ruleName;
  }

  public getFileName() {
    return this.fileName;
  }

  public getRuleName() {
    return this.ruleName;
  }

  public getStartPosition(): RuleFailurePosition {
    return this.startPosition;
  }

  public getEndPosition(): RuleFailurePosition {
    return this.endPosition;
  }

  public getFailure() {
    return this.failure;
  }

  public toJson() {
    return this.toJS();
  }

  public toJS(): any {
    return {
      endPosition: this.endPosition.toJS(),
      failure: this.failure,
      name: this.fileName,
      ruleName: this.ruleName,
      startPosition: this.startPosition.toJS(),
      fixes: this.fixes.map(f => f.toJS())
    };
  }

  public equals(ruleFailure: RuleFailure) {
    return this.failure  === ruleFailure.getFailure()
        && this.fileName === ruleFailure.getFileName()
        && this.startPosition.equals(ruleFailure.getStartPosition())
        && this.endPosition.equals(ruleFailure.getEndPosition());
  }

  private createFailurePosition(position: number) {
    const lineAndCharacter = this.sourceFile.getLineAndCharacterOfPosition(position);
    return new RuleFailurePosition(position, lineAndCharacter);
  }


  public hasFix() {
    return this.fixes && this.fixes.length > 0;
  }
}

