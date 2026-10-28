import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';

const DOMAIN = 0x0000;
const TAG = 'XiaomanGarden';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'Ability onCreate');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Index', (error: BusinessError) => {
      if (error.code) {
        hilog.error(DOMAIN, TAG, 'Failed to load page: %{public}s', JSON.stringify(error));
        return;
      }
      try {
        const mainWindow = windowStage.getMainWindowSync();
        mainWindow.setWindowSystemBarProperties({
          statusBarColor: '#F2E9D9',
          statusBarContentColor: '#293F30',
          navigationBarColor: '#F2E9D9',
          navigationBarContentColor: '#293F30'
        }).catch((systemBarError: BusinessError) => {
          hilog.warn(DOMAIN, TAG, 'System bar styling skipped: %{public}s', JSON.stringify(systemBarError));
        });
      } catch (error) {
        hilog.warn(DOMAIN, TAG, 'System bar styling unavailable');
      }
    });
  }
}
