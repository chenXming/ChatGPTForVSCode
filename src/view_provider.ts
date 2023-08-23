
import * as vscode from 'vscode';
import { fetch } from 'undici';

export default class ChatGptViewProvider implements vscode.WebviewViewProvider {
    private webView?: vscode.WebviewView;
    private apiKey?: string;
    private message?: any;

    constructor(private context: vscode.ExtensionContext) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this.webView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            if (data.type === 'askChatGPT') {
                this.sendOpenAiApiRequest(data.value);
            }
        });

        if (this.message !== null) {
            this.sendMessageToWebView(this.message);
            this.message = null;
        }
    }

    public async ensureApiKey() {
        
        this.apiKey = await this.context.globalState.get('chatgpt-api-key') as string;
        const apiKeyInput = await vscode.window.showInputBox({
            prompt: this.apiKey?`您当前的API Key是：${this.apiKey},您可以重新输入并进行更新`:"请输入你的API Key",
            ignoreFocusOut: true,
        });
        if (apiKeyInput?.length) {
            this.apiKey = apiKeyInput!;
            this.context.globalState.update('chatgpt-api-key', this.apiKey);
        }
    }

    public async sendOpenAiApiRequest(prompt: string, code?: string) {
        this.apiKey = await this.context.globalState.get('chatgpt-api-key') as string;
        if(!this.apiKey) {
            await this.ensureApiKey();
        }

        const question = (code) ? `${prompt}: ${code}` : prompt;

        if (!this.webView) {
            await vscode.commands.executeCommand('chatgpt-vscode-plugin.view.focus');
        } else {
            this.webView?.show?.(true);
        }

        let response: String = '';

        this.sendMessageToWebView({ type: 'addQuestion', value: prompt, code });
         try {
            let currentMessageNumber = this.message;
            let completion =  await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    body: JSON.stringify({
                        model: "text-davinci-003",
                        messages: [{ role: "user", content: question }],
                        temperature: 0.7
                    }),
                    headers: {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        "Content-Type": 'application/json',
                        Authorization: 'Bearer ' + this.apiKey,
                    },
                }) as any;

            if (this.message !== currentMessageNumber) {
                return;
            }

            if(completion.status !== 200) {
                vscode.window.showErrorMessage("GPT:请求失败，errCode=" + completion.status + "");
                return;
            }
            
            response = completion?.data.choices[0]?.text || '';
            const REGEX_CODEBLOCK = new RegExp('\`\`\`', 'g');
            const matches = response.match(REGEX_CODEBLOCK);
            const count = matches ? matches.length : 0;
            if (count % 2 !== 0) {
                response += '\n\`\`\`';
            }
            this.sendMessageToWebView({ type: 'addResponse', value: response });
        } catch (error: any) {
            vscode.window.showErrorMessage("GPT:请求失败.errMessage=", JSON.stringify(error.message));
            this.sendMessageToWebView({ type: 'addResponse', value: '你好！感谢您与我展开友好对话。我将尽力遵守您的要求，避免涉及法律、政治以及与中国官员有关的话题。有什么我可以帮助您的呢？无论是问题、讨论还是闲聊，我都愿意参与。' });
            return;
        }
    }

    public sendMessageToWebView(message: any) {
        if (this.webView) {
            this.webView?.webview.postMessage(message);
        } else {
            this.message = message;
        }
    }

    private getHtml(webview: vscode.Webview) {

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resource', 'webview.js'));
        const stylesMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resource', 'webview.css'));

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesMainUri}" rel="stylesheet">
				<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
				<script src="https://cdn.tailwindcss.com"></script>
			</head>
			<body class="overflow-hidden">
				<div class="flex flex-col h-screen">
					<div class="flex-1 overflow-y-auto" id="qa-list"></div>
					<div id="in-progress" class="p-4 flex items-center hidden">
					</div>
					<div class="p-4 flex items-center">
						<div class="flex-1">
							<textarea
								type="text"
								rows="2"
								class="border p-2 w-full"
								id="question-input"
								placeholder="Ask a question..."
							></textarea>
						</div>
						<button style="background: var(--vscode-button-background)" id="ask-button" class="p-2 ml-5">发送</button>
						<button style="background: var(--vscode-button-background)" id="clear-button" class="p-2 ml-3">清空</button>
					</div>
				</div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}