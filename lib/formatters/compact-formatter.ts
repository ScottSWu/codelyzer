import * as chalk from 'chalk';
import {RuleFailure} from '../language';
import {Formatter} from './formatter';

export class CompactFormatter extends Formatter {
  format(matches: RuleFailure[]): string {
    return matches
      .map((current: RuleFailure) => this.formatMatch(current))
      .join('\n');
  }
  private formatMatch(match: RuleFailure) {
    const l = match.getStartPosition().getLineAndCharacter();
    const pos = chalk.cyan(`[${l.line + 1}, ${l.character + 1}]`);
    const filename = chalk.cyan(match.getFileName());
    const arrow = chalk.magenta('❯');
    return `${filename}${pos} ${arrow} ${chalk.yellow(match.getFailure())}`
  }
}

