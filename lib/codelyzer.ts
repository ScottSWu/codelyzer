import * as ts from 'typescript';
import {RuleFailure, AbstractRule, getProgram, Fix, Replacement, IDisabledInterval} from './language';
import {EnableDisableRulesWalker} from './enable-disable-rules';
import {
  ICodelyzerOptionsRaw,
  ICodelyzerOptions,
  ICodelyzerRuleOption,
  CodelyzerResult
} from './config';

import {
  DEFAULT_REPORTERS_DIR,
  DEFAULT_FORMATTERS_DIR,
  DEFAULT_RULES_DIR,
  DEFAULT_REPORTER,
  DEFAULT_FORMATTER,
} from './default-config';

import {buildDisabledIntervalsFromSwitches} from './utils';

import {MustUseReturn, NoUseBeforeInitialization} from './rules';

export interface RuleConfig {
  rule: any;
  options: any;
}

export interface RulesMap {
  [ruleName: string]: RuleConfig;
}

export {RuleFailure} from './language';

export class Codelyzer {
  private options: ICodelyzerOptions;

  constructor(private fileNames: string[], private program: ts.Program,
    private rulesMap?: RulesMap) {
    this.rulesMap = {};
    this.rulesMap["must-use-return"] = {
      rule: MustUseReturn,
      options: true
    };
    this.rulesMap["no-use-before-initialization"] = {
      rule: NoUseBeforeInitialization,
      options: false
    };
  }

  public lint(): Map<ts.SourceFile, RuleFailure[]> {
    const matchMap = new Map<ts.SourceFile, RuleFailure[]>();
    const program = this.program;

    for (const sourceFile of program.getSourceFiles()) {
      // Make sure this is a source file and not an imported / referenced file
      if (this.fileNames.indexOf(sourceFile.fileName) >= 0) {
        const matches: RuleFailure[] = [];
        const enabledRules = this.getRules(sourceFile);
        for (let rule of enabledRules) {
          const ruleMatches = rule.applyWithProgram(sourceFile, program);
          for (let match of ruleMatches) {
            if (!this.containsMatch(matches, match)) {
              matches.push(match);
            }
          }
        }
        matchMap.set(sourceFile, matches);
      }
    }
    return matchMap;
  }

  private getFixes(match: RuleFailure, choices: string[]): Fix[] {
    return match.fixes
      .filter(f => choices.indexOf(f.description) >= 0)
      // Already sorted
      .reduce((accum, f) => accum.concat(f.replacements), []);
  }

  private sortMatches(matches: RuleFailure[]): RuleFailure[] {
    const sortReplacements = (fix: Fix): Fix => {
      fix.replacements = fix.replacements.sort((a, b) => b.start - a.start);
      return fix;
    };
    const sortFixes = (match: RuleFailure): RuleFailure => {
      match.fixes.forEach(sortReplacements);
      match.fixes = match.fixes.sort((a, b) => b.replacements[0].start - a.replacements[0].start);
      return match;
    };
    const nofixes = matches.filter((m: RuleFailure) => !m.fixes.length);
    return nofixes.concat(matches
      .filter((m: RuleFailure) => m.fixes.length > 0)
      .sort((a, b) => b.fixes[0].replacements[0].start - a.fixes[0].replacements[0].start));
  }

  private getRules(sourceFile: ts.SourceFile): AbstractRule[] {
    // Walk the code first to find all the intervals where rules are disabled
    const rulesWalker = new EnableDisableRulesWalker(sourceFile, {
      disabledIntervals: [],
      ruleName: '',
    });
    rulesWalker.walk(sourceFile);
    const enableDisableRuleMap = rulesWalker.enableDisableRuleMap;
    const result: AbstractRule[] = [];
    // Produces side-effect
    Object.keys(this.rulesMap).forEach((ruleName: string) => {
      let Rule = this.rulesMap[ruleName].rule;
      let options = this.rulesMap[ruleName].options;
      const all = 'all'; // make the linter happy until we can turn it on and off
      const allList = (all in enableDisableRuleMap ? enableDisableRuleMap[all] : []);
      const ruleSpecificList = (ruleName in enableDisableRuleMap ? enableDisableRuleMap[ruleName] : []);
      const disabledIntervals = buildDisabledIntervalsFromSwitches(ruleSpecificList, allList);
      result.push(new Rule(ruleName, options, disabledIntervals));
    });
    return result.filter((r) => r.isEnabled());
  }

  private containsMatch(matches: RuleFailure[], match: RuleFailure): boolean {
    return matches.some(m => m.equals(match));
  }
}

