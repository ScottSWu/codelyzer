import {RuleFailure} from '../language';

export abstract class Formatter {
  abstract format(matches: RuleFailure[]): string;
}

