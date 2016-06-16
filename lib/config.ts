import {RuleFailure} from './language';
import {Formatter} from './formatters/formatter';
import {Reporter} from './reporters/reporter';

export interface CodelyzerResult {
  matches: RuleFailure[];
  reporter: Reporter;
  formatter: Formatter;
}

export interface ICodelyzerRuleOption {
  [ruleName: string]: any[] | boolean;
}

export interface ICodelyzerOptionsRaw {
  rules_config?: ICodelyzerRuleOption;
  rules_directories?: string[];
  reporter?: string;
  reporters_directories?: string[];
  formatter?: string;
  formatters_directories?: string[];
}

export interface ICodelyzerOptions extends ICodelyzerOptionsRaw {
  rules_config: ICodelyzerRuleOption;
  rules_directories: string[];
  reporter: string;
  reporters_directories: string[];
  formatter: string;
  formatters_directories: string[];
}

