'use client';

import { useQuery } from '@tanstack/react-query';
import { ThemeProvider } from '@teable/next-themes';
import { getViewInstallPlugin } from '@teable/openapi';
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
import { useEffect, useState } from 'react';
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
  const pluginBridge = usePluginBridge();
  const { tableId, positionId: viewId } = useEnv();

  console.log(tableId, viewId);

  const { data: pluginInstall, isLoading } = useQuery({
    queryKey: ['plugin-install'],
    queryFn: () => getViewInstallPlugin(tableId!, viewId!).then((res) => res.data),
    enabled: Boolean(tableId && viewId),
  });

  const [config, setConfig] = useState<IConfig>({
    isGrouped: false,
    isConfigured: false,
    analysisMode: 'intelligent',
    relations: [],
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(!config.isConfigured);

  const handleStartAnalysis = () => {
    if (config.validate?.()) {
      setConfig((prev) => ({ ...prev, isConfigured: true }));
      setIsSettingsOpen(false);
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

                          <ConfigForm
                            config={config}
                            onConfigChange={(newConfig) => {
                              console.log(newConfig);
                              setConfig((prev) => ({
                                ...prev,
                                ...newConfig,
                                relations: newConfig.relations || prev.relations,
                              }));
                            }}
                          />
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
