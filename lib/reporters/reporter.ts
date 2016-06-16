import {RuleFailure} from '../language';

export abstract class Reporter {
  abstract report(matches: RuleFailure): Promise<any>;
}

