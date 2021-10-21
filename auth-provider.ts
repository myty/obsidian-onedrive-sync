import {
    Configuration,
    PublicClientApplication,
    LogLevel,
    CryptoProvider,
    AuthenticationResult,
    AccountInfo,
    AuthorizationCodeRequest,
    AuthorizationUrlRequest,
} from "@azure/msal-node";
import EventStream from "pub-sub";

type PkceCodes = { challengeMethod: "S256"; verifier: string; challenge: string };

const REDIRECT_URI = "obsidian://onedrive-sync-auth";
const LOGGING_ON = false;

/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL Node configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/configuration.md
 */
const MSAL_CONFIG: Configuration = {
    auth: {
        clientId: "7871eb0f-c44e-4b66-997f-2b461b01ae41",
    },
    system: {
        loggerOptions: {
            loggerCallback(_loglevel: any, message: any) {
                if (!LOGGING_ON) return;

                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: LogLevel.Verbose,
        },
    },
};

export default class AuthProvider {
    clientApplication;
    cryptoProvider;
    authCodeUrlParams: AuthorizationUrlRequest;
    authCodeRequest: AuthorizationCodeRequest;
    pkceCodes: PkceCodes;
    account: AccountInfo;

    private readonly eventStream = new EventStream<string>();

    constructor() {
        /**
         * Initialize a public client application. For more information, visit:
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/initialize-public-client-application.md
         */
        this.clientApplication = new PublicClientApplication(MSAL_CONFIG);
        this.account = null;

        // Initialize CryptoProvider instance
        this.cryptoProvider = new CryptoProvider();

        this.setRequestObjects();
    }

    /**
     * Initialize request objects used by this AuthModule.
     */
    setRequestObjects() {
        const requestScopes = ["onedrive.appfolder"];
        const redirectUri = REDIRECT_URI;

        this.authCodeUrlParams = {
            scopes: requestScopes,
            redirectUri: redirectUri,
        };

        this.authCodeRequest = {
            scopes: requestScopes,
            redirectUri: redirectUri,
            code: null,
        };

        this.pkceCodes = {
            challengeMethod: "S256", // Use SHA256 Algorithm
            verifier: "", // Generate a code verifier for the Auth Code Request first
            challenge: "", // Generate a code challenge from the previously generated code verifier
        };
    }

    async login() {
        const authResult = await this.getTokenInteractive(this.authCodeUrlParams);
        return this.handleResponse(authResult);
    }

    async getToken(tokenRequest: AuthorizationUrlRequest) {
        let authResponse;

        authResponse = await this.getTokenInteractive(tokenRequest);

        return authResponse.accessToken || null;
    }

    async getTokenInteractive(tokenRequest: AuthorizationUrlRequest) {
        /**
         * Proof Key for Code Exchange (PKCE) Setup
         *
         * MSAL enables PKCE in the Authorization Code Grant Flow by including the codeChallenge and codeChallengeMethod parameters
         * in the request passed into getAuthCodeUrl() API, as well as the codeVerifier parameter in the
         * second leg (acquireTokenByCode() API).
         *
         * MSAL Node provides PKCE Generation tools through the CryptoProvider class, which exposes
         * the generatePkceCodes() asynchronous API. As illustrated in the example below, the verifier
         * and challenge values should be generated previous to the authorization flow initiation.
         *
         * For details on PKCE code generation logic, consult the
         * PKCE specification https://tools.ietf.org/html/rfc7636#section-4
         */

        const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();
        this.pkceCodes.verifier = verifier;
        this.pkceCodes.challenge = challenge;

        const authCodeUrlParams: AuthorizationUrlRequest = {
            ...this.authCodeUrlParams,
            scopes: tokenRequest.scopes,
            codeChallenge: this.pkceCodes.challenge, // PKCE Code Challenge
            codeChallengeMethod: this.pkceCodes.challengeMethod, // PKCE Code Challenge Method
        };

        const authCodeUrl = await this.clientApplication.getAuthCodeUrl(authCodeUrlParams);

        const authCode = await this.listenForAuthCode(authCodeUrl);

        const authResponse = await this.clientApplication.acquireTokenByCode({
            ...this.authCodeRequest,
            scopes: tokenRequest.scopes,
            code: authCode,
            codeVerifier: this.pkceCodes.verifier, // PKCE Code Verifier
        });

        return authResponse;
    }

    setAuthCode(code: string) {
        this.eventStream.send(code);
    }

    async listenForAuthCode(authCodeUrl: string): Promise<string> {
        const authCodeListenerPromise = new Promise<string>((resolve, reject) => {
            this.eventStream.receive((authCode) => {
                try {
                    resolve(authCode);
                } catch (err) {
                    reject(err);
                }
            });
        });

        // TODO: Call Auth code
        window.open(authCodeUrl);

        return authCodeListenerPromise;
    }

    /**
     * Handles the response from a popup or redirect. If response is null, will check if we have any accounts and attempt to sign in.
     * @param response
     */
    async handleResponse(response: AuthenticationResult) {
        if (response !== null) {
            this.account = response.account;
        } else {
            this.account = await this.getAccount();
        }

        return this.account;
    }

    /**
     * Calls getAllAccounts and determines the correct account to sign into, currently defaults to first account found in cache.
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */
    async getAccount() {
        // need to call getAccount here?
        const cache = this.clientApplication.getTokenCache();
        const currentAccounts = await cache.getAllAccounts();

        if (currentAccounts === null) {
            console.log("No accounts detected");
            return null;
        }

        if (currentAccounts.length > 1) {
            // Add choose account code here
            console.log("Multiple accounts detected, need to add choose account code.");
            return currentAccounts[0];
        } else if (currentAccounts.length === 1) {
            return currentAccounts[0];
        } else {
            return null;
        }
    }
}
