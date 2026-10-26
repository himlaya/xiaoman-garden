import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { webview } from '@kit.ArkWeb';

const SAVE_KEY: string = 'xiaoman-garden-save-v1';
const PREF_NAME: string = 'xiaoman_garden';
const PREF_KEY: string = 'save_json';
const BACKGROUND: string = '#F6F0E3';
const INK: string = '#304536';
const INK_SOFT: string = '#7C8878';

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();
  @State private storageReady: boolean = false;
  @State private scripts: Array<ScriptItem> = [];
  @State private loadError: string = '';
  private pref: preferences.Preferences | null = null;
  private pageReady: boolean = false;
  private backupTimer: number = -1;
  private lastBackup: string = '';

  aboutToAppear(): void {
    this.prepareStorage();
    // localStorage 在部分 ArkWeb 本地资源场景下可能在进程结束后被清理；
    // 每 5 秒把存档备份到 HarmonyOS Preferences，重启时再注入回 localStorage。
    this.backupTimer = setInterval(() => {
      this.backupSave();
    }, 5000);
  }

  aboutToDisappear(): void {
    if (this.backupTimer !== -1) {
      clearInterval(this.backupTimer);
      this.backupTimer = -1;
    }
    this.backupSave();
  }

  private async prepareStorage(): Promise<void> {
    let restored: string = '';
    try {
      const context = getContext(this) as common.UIAbilityContext;
      const store = await preferences.getPreferences(context, { name: PREF_NAME });
      this.pref = store;
      const value = await store.get(PREF_KEY, '');
      if (typeof value === 'string') {
        restored = value;
      }
    } catch (error) {
      console.error('Unable to open HarmonyOS preferences: ' + JSON.stringify(error));
    }
    this.scripts = [
      {
        script: this.buildRestoreScript(restored),
        scriptRules: ['*']
      }
    ];
    this.storageReady = true;
  }

  private buildRestoreScript(saved: string): string {
    const incoming: string = JSON.stringify(saved);
    const key: string = JSON.stringify(SAVE_KEY);
    return '(function(){' +
      'window.__XIAOMAN_HARMONY__=true;' +
      'try{var KEY=' + key + ';var incoming=' + incoming + ';' +
      'if(!incoming){return;}' +
      'var local=null;try{local=localStorage.getItem(KEY);}catch(e){}' +
      'if(!local){try{localStorage.setItem(KEY,incoming);}catch(e){}return;}' +
      'try{var next=JSON.parse(incoming);var old=JSON.parse(local);' +
      'if(!old||((next.updatedAt||0)>(old.updatedAt||0))){localStorage.setItem(KEY,incoming);}' +
      '}catch(e){try{localStorage.setItem(KEY,incoming);}catch(ignore){}}' +
      '}catch(e){}})();';
  }

  private async backupSave(): Promise<void> {
    if (!this.pageReady) {
      return;
    }
    const store = this.pref;
    if (store === null) {
      return;
    }
    try {
      const value = await this.controller.runJavaScript(
        "window.localStorage.getItem('" + SAVE_KEY + "')"
      );
      if (value && value !== 'null' && value !== 'undefined' && value !== this.lastBackup) {
        await store.put(PREF_KEY, value);
        await store.flush();
        this.lastBackup = value;
      }
    } catch (error) {
      console.warn('HarmonyOS save backup skipped: ' + JSON.stringify(error));
    }
  }

  private retryLoad(): void {
    this.loadError = '';
    try {
      this.controller.refresh();
    } catch (error) {
      console.error('Unable to refresh ArkWeb page: ' + JSON.stringify(error));
    }
  }

  build() {
    Stack() {
      if (this.storageReady) {
        Web({ src: $rawfile('www/index.html'), controller: this.controller })
          .width('100%')
          .height('100%')
          .backgroundColor(BACKGROUND)
          .javaScriptAccess(true)
          .domStorageAccess(true)
          .fileAccess(true)
          .imageAccess(true)
          .onlineImageAccess(false)
          .zoomAccess(false)
          .horizontalScrollBarAccess(false)
          .verticalScrollBarAccess(false)
          .javaScriptOnDocumentStart(this.scripts)
          .onPageEnd(() => {
            this.pageReady = true;
            this.loadError = '';
            this.backupSave();
          })
          .onErrorReceive((event) => {
            if (event.request.isMainFrame()) {
              this.loadError = '花园暂时没有打开，请再试一次。';
            }
          })
      } else {
        Column({ space: 10 }) {
          Text('小满花园')
            .fontSize(30)
            .fontWeight(FontWeight.Medium)
            .fontColor(INK)
          Text('正在把花种取出来…')
            .fontSize(13)
            .fontColor(INK_SOFT)
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
        .backgroundColor(BACKGROUND)
      }

      if (this.loadError !== '') {
        Column({ space: 14 }) {
          Text(this.loadError)
            .fontSize(15)
            .fontColor(INK)
            .textAlign(TextAlign.Center)
          Button('重新打开花园')
            .fontSize(14)
            .fontColor('#FFF8EA')
            .backgroundColor('#4E6B50')
            .borderRadius(12)
            .onClick(() => this.retryLoad())
        }
        .width('86%')
        .padding(24)
        .borderRadius(22)
        .backgroundColor('#FFFDF8')
        .shadow({ radius: 24, color: '#22000000', offsetY: 10 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(BACKGROUND)
  }
}
