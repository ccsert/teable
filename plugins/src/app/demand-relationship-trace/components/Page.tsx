'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { ThemeProvider } from '@teable/next-themes';
import { getViewInstallPlugin, updateViewPluginStorage } from '@teable/openapi';
import type { IUIConfig } from '@teable/sdk';
import {
  AnchorContext,
  AppProvider,
  FieldProvider,
  TableProvider,
  usePluginBridge,
  ViewProvider,
} from '@teable/sdk';
import { Spin } from '@teable/ui-lib';
import { Button, Sheet, SheetContent, SheetTrigger } from '@teable/ui-lib/dist/shadcn';
import { Settings2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEnv } from '../../../hooks/useEnv';
import { useInitializationZodI18n } from '../../../hooks/useInitializationZodI18n';
import type { IConfig } from '../types';
import { ConfigForm } from './ConfigForm';

interface IPageProps {
  lang: string;
  baseId: string;
  dashboardId: string;
  pluginInstallId: string;
  theme: string;
}

export const Pages = (props: IPageProps) => {
  const pluginBridge = usePluginBridge();
  const [uiConfig, setUIConfig] = useState<IUIConfig | undefined>();
  useInitializationZodI18n();
  useEffect(() => {
    if (!pluginBridge) {
      return;
    }
    const uiConfigListener = (config: IUIConfig) => {
      setUIConfig(config);
    };
    pluginBridge.on('syncUIConfig', uiConfigListener);
    return () => {
      pluginBridge.removeListener('syncUIConfig', uiConfigListener);
    };
  }, [pluginBridge]);

  return (
    <ThemeProvider attribute="class" forcedTheme={uiConfig?.theme ?? props.theme}>
      <Container {...props} uiConfig={uiConfig} />
    </ThemeProvider>
  );
};

const Container = (props: IPageProps & { uiConfig?: IUIConfig }) => {
  const { i18n, t } = useTranslation();
  const { tableId, positionId: viewId } = useEnv();
  const pluginBridge = usePluginBridge();

  // 获取插件配置
  const { data: pluginInstall, isLoading } = useQuery({
    queryKey: ['plugin-install'],
    queryFn: () => getViewInstallPlugin(tableId!, viewId!).then((res) => res.data),
    enabled: Boolean(tableId && viewId),
  });
  const { mutateAsync: updateStorageFn } = useMutation({
    mutationFn: ({
      tableId,
      viewId,
      pluginInstallId,
      storage,
    }: {
      tableId: string;
      viewId: string;
      pluginInstallId: string;
      storage: Record<string, unknown>;
    }) => updateViewPluginStorage(tableId, viewId, pluginInstallId, storage),
  });

  const updateConfig = useCallback(
    async (config: IConfig) => {
      if (!tableId || !viewId || !pluginInstall?.pluginInstallId) return;
      await updateStorageFn({
        tableId,
        viewId,
        pluginInstallId: pluginInstall.pluginInstallId,
        storage: {
          ...config,
        },
      });
    },
    [tableId, viewId, pluginInstall?.pluginInstallId, updateStorageFn]
  );

  const [config, setConfig] = useState<IConfig>({
    isGrouped: false,
    isConfigured: false,
    analysisMode: 'intelligent',
    relations: [],
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 初始化配置
  useEffect(() => {
    if (pluginInstall?.storage) {
      const storageConfig = pluginInstall.storage as unknown as IConfig;
      setConfig(storageConfig);

      // 如果没有配置过，打开设置面板
      if (!storageConfig.isConfigured) {
        setIsSettingsOpen(true);
      }
    }
  }, [pluginInstall]);

  const handleConfigChange = async (newConfig: Partial<IConfig>) => {
    const updatedConfig = {
      ...config,
      ...newConfig,
    };

    try {
      await updateConfig(updatedConfig);
      setConfig(updatedConfig);

      // 如果配置已完成，关闭设置面板
      if (updatedConfig.isConfigured) {
        setIsSettingsOpen(false);
      }
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!props.baseId || !props.pluginInstallId) {
    return <div className="text-center text-muted-foreground">{t('initBridge')}</div>;
  }
  if (!pluginBridge) {
    return (
      <div className="flex flex-col items-center justify-center">
        <p className="text-center text-muted-foreground">{t('initBridge')}</p>
      </div>
    );
  }
  return (
    <ThemeProvider attribute="class" forcedTheme={props.uiConfig?.theme}>
      <AppProvider
        lang={i18n.resolvedLanguage}
        locale={i18n.getDataByLanguage(i18n.resolvedLanguage || i18n.language)?.sdk}
      >
        <AnchorContext.Provider
          value={{
            baseId: props.baseId,
            tableId,
            viewId,
          }}
        >
          <TableProvider>
            <ViewProvider>
              <FieldProvider>
                <div className="relative h-screen w-full">
                  {/* 主画布区域 */}
                  <div className="size-full bg-background">
                    {!config.isConfigured ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-muted-foreground">{t('pleaseConfigureFirst')}</p>
                      </div>
                    ) : (
                      <div className="size-full">测试</div>
                    )}
                  </div>

                  {/* 设置按钮和配置面板 */}
                  <div className="absolute right-4 top-4">
                    <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Settings2 className="size-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium">{t('settings')}</h3>
                          <ConfigForm config={config} onConfigChange={handleConfigChange} />
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
              </FieldProvider>
            </ViewProvider>
          </TableProvider>
        </AnchorContext.Provider>
      </AppProvider>
    </ThemeProvider>
  );
};
