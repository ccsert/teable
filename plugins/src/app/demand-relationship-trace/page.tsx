import enSDkJson from '@teable/common-i18n/src/locales/en/sdk.json';
import enZodJson from '@teable/common-i18n/src/locales/en/zod.json';
import zhSDkJson from '@teable/common-i18n/src/locales/zh/sdk.json';
import zhZodJson from '@teable/common-i18n/src/locales/zh/zod.json';
import { EnvProvider } from '../../components/EnvProvider';
import { I18nProvider } from '../../components/I18nProvider';
import QueryClientProvider from '../../components/QueryClientProvider';
import { PageType } from '../../components/types';
import enCommonJson from '../../locales/demand-relationship-trace/en.json';
import zhCommonJson from '../../locales/demand-relationship-trace/zh.json';
import { Pages } from './components/Page';

const resources = {
  en: { sdk: enSDkJson, common: enCommonJson, zod: enZodJson },
  zh: { sdk: zhSDkJson, common: zhCommonJson, zod: zhZodJson },
};
export default async function Home(props: {
  searchParams: {
    lang: string;
    baseId: string;
    pluginInstallId: string;
    dashboardId: string;
    pluginId: string;
    theme: string;
    shareId?: string;
  };
}) {
  return (
    <main className="flex h-screen flex-col items-center justify-center">
      <EnvProvider>
        <I18nProvider
          lang={props.searchParams.lang}
          resources={resources}
          defaultNS="common"
          pageType={PageType.View}
        >
          <QueryClientProvider>
            <Pages {...props.searchParams} />
          </QueryClientProvider>
        </I18nProvider>
      </EnvProvider>
    </main>
  );
}
