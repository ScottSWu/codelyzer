import * as ts from 'typescript';
import {sprintf} from 'sprintf-js';
import SyntaxKind = require('./util/syntaxKind');

import {AbstractRule, RuleWalker, RuleFailure, Fix} from '../language';

export class Rule extends AbstractRule {

    public apply(sourceFile:ts.SourceFile): RuleFailure[] {
        return this.applyWithWalker(
            new ExpressionCallMetadataWalker(sourceFile,
                this.getOptions()));
    }

    static FAILURE_IN_CLASS:string = 'Avoid using forwardRef in class "%s"';
    static FAILURE_IN_VARIABLE:string = 'Avoid using forwardRef in variable "%s"';
}

export class ExpressionCallMetadataWalker extends RuleWalker {

    visitCallExpression(node:ts.CallExpression) {
        this.validateCallExpression(node);
        super.visitCallExpression(node);
    }

    private validateCallExpression(callExpression: any) {
        if (callExpression.expression.text === 'forwardRef') {
            let currentNode:any = callExpression;
            while (currentNode.parent.parent) {
                currentNode = currentNode.parent;
            }
            let failureConfig:string[] =[];
            if(currentNode.kind===SyntaxKind.current().VariableStatement){
                failureConfig=[Rule.FAILURE_IN_VARIABLE,currentNode.declarationList.declarations[0].name.text];
            }else{
                failureConfig=[Rule.FAILURE_IN_CLASS,currentNode.name.text];
            }
            this.addFailure(
                this.createFailure(
                    callExpression.getStart(),
                    callExpression.getWidth(),
                    sprintf.apply(this, failureConfig)));
        }
    }

}