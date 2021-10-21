import AuthProvider from "auth-provider";
import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    ObsidianProtocolData,
    Plugin,
    PluginManifest,
    PluginSettingTab,
    Setting,
    Vault,
} from "obsidian";

interface OneDriveSyncSettings {
    token?: string;
}

const DEFAULT_SETTINGS: OneDriveSyncSettings = {
    token: undefined,
};

export default class OneDriveSync extends Plugin {
    settings: OneDriveSyncSettings;
    authProvider: AuthProvider;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.authProvider = new AuthProvider();
    }

    async onload() {
        await this.loadSettings();

        this.registerObsidianProtocolHandler(
            "onedrive-sync-auth",
            (params: ObsidianProtocolData) => {
                this.authProvider.setAuthCode(params["code"]);
            },
        );

        // // This creates an icon in the left ribbon.
        // let ribbonIconEl = this.addRibbonIcon('cloud', 'OneDrive Sync', (evt: MouseEvent) => {
        //     // Called when the user clicks the icon.
        //     new Notice('This is a notice!');
        // });
        // // Perform additional things with the ribbon
        // ribbonIconEl.addClass('my-plugin-ribbon-class');

        // // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        // let statusBarItemEl = this.addStatusBarItem();
        // statusBarItemEl.setText('Syncing OneDrive...');

        // // This adds a simple command that can be triggered anywhere
        // this.addCommand({
        //     id: 'open-sample-modal-simple',
        //     name: 'Open sample modal (simple)',
        //     callback: () => {
        //         new SampleModal(this.app).open();
        //     },
        // });
        // // This adds an editor command that can perform some operation on the current editor instance
        // this.addCommand({
        //     id: 'sample-editor-command',
        //     name: 'Sample editor command',
        //     editorCallback: (editor: Editor, view: MarkdownView) => {
        //         console.log(editor.getSelection());
        //         editor.replaceSelection('Sample Editor Command');
        //     },
        // });
        // // This adds a complex command that can check whether the current state of the app allows execution of the command
        // this.addCommand({
        //     id: 'open-sample-modal-complex',
        //     name: 'Open sample modal (complex)',
        //     checkCallback: (checking: boolean) => {
        //         // Conditions to check
        //         let markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        //         if (markdownView) {
        //             // If checking is true, we're simply "checking" if the command can be run.
        //             // If checking is false, then we want to actually perform the operation.
        //             if (!checking) {
        //                 new SampleModal(this.app).open();
        //             }

        //             // This command will only show up in Command Palette when the check function returns true
        //             return true;
        //         }
        //     },
        // });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // this.registerEvent(
        //     this.app.vault.on("create", (file) => {
        //         console.log("file - created", file);
        //     }),
        // );

        // this.registerEvent(
        //     this.app.vault.on("modify", (file) => {
        //         console.log("file - modified", file);
        //     }),
        // );

        // this.registerEvent(
        //     this.app.vault.on("delete", (file) => {
        //         console.log("file - deleted", file);
        //     }),
        // );

        // this.registerEvent(
        //     this.app.vault.on("rename", (file) => {
        //         console.log("file - renamed", file);
        //     }),
        // );

        // // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // // Using this function will automatically remove the event listener when this plugin is disabled.
        // this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
        //     console.log('click', evt);
        // });

        // // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        // this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// class SampleModal extends Modal {
//     constructor(app: App) {
//         super(app);
//     }

//     onOpen() {
//         let { contentEl } = this;
//         contentEl.setText("Woah!");
//     }

//     onClose() {
//         let { contentEl } = this;
//         contentEl.empty();
//     }
// }

class SampleSettingTab extends PluginSettingTab {
    plugin: OneDriveSync;

    constructor(app: App, plugin: OneDriveSync) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl("button", { text: "Sign In" }).onClickEvent(async () => {
            const accountInfo = await this.plugin.authProvider.login();
            console.log("accountInfo", accountInfo);

            this.plugin.settings.token = accountInfo.username;
            await this.plugin.saveSettings();
        });

        new Setting(containerEl)
            .setName("OneDrive Auth Token")
            .setDesc("It's a secret")
            .setDisabled(true)
            .addText((text) => text.setValue(this.plugin.settings.token));
    }
}
