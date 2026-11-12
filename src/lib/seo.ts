import { getText, localePath, locales, type Locale, type Tool } from './i18n';
import { absoluteSiteUrl, alternateUrls, routeSeoPolicy } from './seo-routes';

export interface PageSeoInput {
  site?: string | URL;
  base?: string;
  locale: Locale;
  route?: string;
  title: string;
  description: string;
  contactEmail?: string;
  tool?: Tool;
  features?: readonly string[];
  pageLabel?: string;
}
export type SchemaNode = Record<string, unknown> & { '@type': string; '@id': string };
const ogLocales: Record<Locale,string> = {en:'en_US',ko:'ko_KR',es:'es_ES',ja:'ja_JP'};

export function createPageSeo({site,base='/',locale,route='',title,description,contactEmail='',tool,features=[],pageLabel}:PageSeoInput) {
  const d=getText(locale);
  const policy=routeSeoPolicy(route,contactEmail);
  const canonical=policy.canonical?absoluteSiteUrl(localePath(locale,route),site,base):undefined;
  const alternates=policy.alternates?alternateUrls(route,site,base):[];
  const image=canonical?absoluteSiteUrl('/social-card.png',site,base):undefined;
  const graph:SchemaNode[]=[];
  if(policy.indexable&&canonical) {
    const websiteUrl=absoluteSiteUrl('/',site,base)!;
    const websiteId=`${websiteUrl}#website`;
    graph.push({
      '@type':'WebSite','@id':websiteId,name:'PDFEditGo',url:websiteUrl,
      inLanguage:[...locales],image:absoluteSiteUrl('/logo.png',site,base),
    });
    const page:SchemaNode={
      '@type':'WebPage','@id':`${canonical}#webpage`,url:canonical,name:title,
      description,inLanguage:locale,isPartOf:{'@id':websiteId},
      primaryImageOfPage:{'@type':'ImageObject',url:image,width:1200,height:630},
    };
    if(route) {
      const breadcrumbId=`${canonical}#breadcrumb`;
      page.breadcrumb={'@id':breadcrumbId};
      graph.push({
        '@type':'BreadcrumbList','@id':breadcrumbId,itemListElement:[
          {'@type':'ListItem',position:1,name:d.homeLabel,item:absoluteSiteUrl(localePath(locale),site,base)},
          {'@type':'ListItem',position:2,name:pageLabel||(tool?d.tools[tool].name:title),item:canonical},
        ],
      });
    }
    if(tool&&route===tool) {
      const applicationId=`${canonical}#application`;
      page.mainEntity={'@id':applicationId};
      graph.push({
        '@type':'WebApplication','@id':applicationId,name:d.tools[tool].name,
        description,url:canonical,inLanguage:locale,applicationCategory:'UtilitiesApplication',
        operatingSystem:'Web browser',browserRequirements:'JavaScript and a modern web browser',
        isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},
        featureList:[...features],mainEntityOfPage:{'@id':page['@id']},
      });
    }
    graph.push(page);
  }
  return {
    ...policy,canonical,alternates,image,
    robots:policy.indexable?'index, follow, max-image-preview:large':'noindex, follow',
    ogLocale:ogLocales[locale],ogAlternateLocales:locales.filter(lang=>lang!==locale).map(lang=>ogLocales[lang]),
    structuredData:graph.length?{'@context':'https://schema.org','@graph':graph}:undefined,
  };
}
