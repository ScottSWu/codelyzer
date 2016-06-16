import * as ts from 'typescript';
import {AbstractRule, RuleFailure} from '../language';
import {sprintf} from 'sprintf-js';
import SyntaxKind = require('./util/syntaxKind');
import {Ng2Walker} from "./util/ng2Walker";

export class Rule extends AbstractRule {

    public apply(sourceFile:ts.SourceFile): RuleFailure[] {
        return this.applyWithWalker(
            new ClassMetadataWalker(sourceFile,
                this.getOptions()));
    }

    static FAILURE:string = "The name of the class %s should end with the suffix Component ($$02-03$$)";

    static validate(className:string):boolean {
        return /.*Component$/.test(className);
    }
}

export class ClassMetadataWalker extends Ng2Walker {

    visitNg2Component(controller:ts.ClassDeclaration, decorator:ts.Decorator) {
        let name = controller.name;
        let className:string = name.text;
        if (!Rule.validate(className)) {
            this.addFailure(
                this.createFailure(
                    name.getStart(),
                    name.getWidth(),
                    sprintf.apply(this, [Rule.FAILURE, className])));
        }
    }
}
