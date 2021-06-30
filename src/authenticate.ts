import * as vscode from 'vscode';
import { apiBaseUrl, extensionAPIPort } from './constants';

import * as polka from "polka";
import { TokenManager } from './TokenManager';
export const authenticate = (fn: () => void) => {
    const app = polka();

    app.get(`/auth/:token`, async (req: any, res: any) => {
        const { token } = req.params;
        if (!token) {
            res.end(`<h1>Something went wrong</h1>`);
            return;
        }
        TokenManager.setToken(token);
        fn();

        res.end(`<h1>Authentication was successful, please close this window and reload the extension.</h1>`);
        (app as any).server.close();
    });

    app.listen(extensionAPIPort, (err: Error) => {
        if (err) {
            vscode.window.showErrorMessage(err.message);
        } else {
            vscode.commands.executeCommand(
                'vscode.open', 
                vscode.Uri.parse(`${apiBaseUrl}/auth/github`)
            );
        }
    });
};