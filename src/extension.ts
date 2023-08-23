// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
import * as vscode from 'vscode';
const view_provider = require("./view_provider");

export function activate(context: vscode.ExtensionContext) {

	const chatViewProvider = new view_provider.default(context);

	context.subscriptions.push(
	vscode.commands.registerCommand('chatgpt-for-vscode.askGPT', askChatGPT), 
	vscode.commands.registerCommand('chatgpt-for-vscode.whyBroken', askGPTWhyBroken), 
	vscode.commands.registerCommand('chatgpt-for-vscode.explainCode', askGPTToExplain), 
	vscode.commands.registerCommand('chatgpt-for-vscode.refactor', askGPTToRefactor), 
	vscode.commands.registerCommand('chatgpt-for-vscode.optimizeCode', askGPTToOptimize), 
	 vscode.commands.registerCommand('chatgpt-for-vscode.setAPIKey', resetToken), 
	vscode.window.registerWebviewViewProvider("chatgpt-for-vscode.view", chatViewProvider, {
		webviewOptions: { retainContextWhenHidden: true }})
	);
	async function askGPTWhyBroken() { await askChatGPT('说明下面的代码会出现什么问题?'); }
	async function askGPTToExplain() { await askChatGPT('请帮我解释一下下面的代码?'); }
	async function askGPTToRefactor() { await askChatGPT('帮我重构下面的代码'); }
	async function askGPTToOptimize() { await askChatGPT('帮我优化下面的代码'); }
	async function resetToken() {
		await chatViewProvider.ensureApiKey();
	}

	async function askChatGPT(userInput: string) {
      
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            const selectedCode = editor.document.getText(vscode.window.activeTextEditor?.selection);
			if(selectedCode.length) {
			    chatViewProvider.sendOpenAiApiRequest(userInput, selectedCode);
				vscode.window.showInformationMessage(selectedCode);
			}else {
				vscode.window.showInformationMessage(`请选中一段代码`);
			}
        }
    }
}

export function deactivate() {}
