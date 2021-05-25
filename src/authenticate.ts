import * as vscode from 'vscode';
import { apiBaseUrl } from './constants';
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

        res.end(`<h1>Authentication was successful, you can close this window now.</h1>`);
        (app as any).server.close();
    });

    app.listen(54321, (err: Error) => {
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